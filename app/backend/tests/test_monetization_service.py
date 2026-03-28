from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.database import Base
from models.billing import BillingPayment, BillingSubscription
from models.listings import Listings
from models.monetization import ListingPromotion
from models.profiles import BusinessProfile, UserProfile
from services.listings_service import ListingsService
from services.monetization import MonetizationService, PaymentRequiredError


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


async def create_listing(
    db_session,
    *,
    user_id: str,
    module: str = "services",
    category: str = "services",
    owner_type: str = "private_user",
    owner_id: str | None = None,
    pricing_tier: str = "free",
    status: str = "draft",
    title: str = "Listing title",
    meta_json: str = "{}",
):
    listing = await ListingsService(db_session).create_listing(
        user_id=user_id,
        module=module,
        category=category,
        title=title,
        description="Long enough description",
        city="Madrid",
        owner_type=owner_type,
        owner_id=owner_id or user_id,
        pricing_tier=pricing_tier,
        visibility="standard",
        ranking_score=0,
        expiry_date=datetime.now(timezone.utc) + timedelta(days=7),
        price=None,
        currency="EUR",
        subcategory=None,
        region=None,
        images_json="[]",
        meta_json=meta_json,
    )
    listing.status = status
    await db_session.commit()
    await db_session.refresh(listing)
    return listing


@pytest.mark.asyncio
async def test_first_private_trial_is_granted_once_per_account(db_session):
    service = MonetizationService(db_session)

    first_decision = await service.resolve_listing_creation(
        "user-1",
        "services",
        "services",
        "private_user",
        "user-1",
        "free",
    )

    assert first_decision.pricing_tier == "free"
    assert first_decision.pricing_policy == "private_trial"
    assert first_decision.metadata_patch is not None
    assert first_decision.metadata_patch["_pricing_policy"] == "private_trial"
    assert first_decision.metadata_patch["_verification_hooks"] == {
        "email_required": True,
        "phone_required": True,
        "phone_enforcement_ready": False,
    }

    await create_listing(
        db_session,
        user_id="user-1",
        pricing_tier="free",
        title="Trial listing",
        meta_json=MonetizationService.merge_listing_metadata(None, first_decision.metadata_patch),
    )

    with pytest.raises(PaymentRequiredError) as exc_info:
        await service.resolve_listing_creation(
            "user-1",
            "services",
            "services",
            "private_user",
            "user-1",
            "free",
        )

    assert exc_info.value.product_code == "next_private_listing_30"
    assert exc_info.value.paywall_reason == "private_trial_already_used"


@pytest.mark.asyncio
async def test_private_trial_verification_gate_is_explicitly_deferred_without_persisted_state(db_session):
    gate = await MonetizationService(db_session).evaluate_private_trial_verification_gate("user-1")

    assert gate["can_activate"] is True
    assert gate["email_required"] is True
    assert gate["phone_required"] is True
    assert gate["email_enforcement_ready"] is False
    assert gate["phone_enforcement_ready"] is False
    assert gate["deferred_checks"] == [
        "email_verification_not_persisted",
        "phone_verification_not_persisted",
    ]


@pytest.mark.asyncio
async def test_basic_listing_requires_payment_before_submit(db_session):
    listing = await create_listing(
        db_session,
        user_id="user-1",
        pricing_tier="basic",
        meta_json=MonetizationService.merge_listing_metadata(
            None,
            MonetizationService.build_listing_pricing_metadata(
                policy="private_paid",
                module="services",
                category="services",
            ),
        ),
    )
    service = ListingsService(db_session)

    with pytest.raises(PaymentRequiredError) as exc_info:
        await service.submit_listing(listing.id)

    assert exc_info.value.product_code == "next_private_listing_30"
    assert exc_info.value.paywall_reason == "payment_required_for_basic_listing"

    now = datetime.now(timezone.utc)
    db_session.add(
        BillingPayment(
            user_id="user-1",
            listing_id=listing.id,
            provider="stripe",
            product_code="next_private_listing_30",
            product_type="listing_purchase",
            target_type="listing",
            title="Next private listing for 30 days",
            status="paid",
            entitlement_status="active",
            amount_total=Decimal("4.99"),
            currency="eur",
            checkout_mode="payment",
            period_start=now,
            period_end=now + timedelta(days=30),
            paid_at=now,
            metadata_json="{}",
        )
    )
    await db_session.commit()

    submitted = await service.submit_listing(listing.id)
    assert submitted is not None
    assert submitted.status == "moderation_pending"


@pytest.mark.asyncio
async def test_private_trial_requires_extension_payment_after_day_seven(db_session):
    listing = await create_listing(
        db_session,
        user_id="user-1",
        pricing_tier="free",
        meta_json=MonetizationService.merge_listing_metadata(
            None,
            MonetizationService.build_listing_pricing_metadata(
                policy="private_trial",
                module="services",
                category="services",
                requires_email_verification=True,
                requires_phone_verification=True,
            ),
        ),
    )
    listing.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    await db_session.commit()

    with pytest.raises(PaymentRequiredError) as exc_info:
        await ListingsService(db_session).submit_listing(listing.id)

    assert exc_info.value.product_code == "listing_extend_30"
    assert exc_info.value.paywall_reason == "private_trial_extension_required"
    assert exc_info.value.listing_id == listing.id


@pytest.mark.asyncio
async def test_always_free_categories_bypass_private_paid_logic(db_session):
    decision = await MonetizationService(db_session).resolve_listing_creation(
        "user-1",
        "jobs",
        "job-seekers",
        "private_user",
        "user-1",
        "free",
    )

    assert decision.pricing_tier == "free"
    assert decision.pricing_policy == "always_free"
    assert decision.required_product_code is None


@pytest.mark.asyncio
async def test_legacy_private_listing_backfill_marks_live_non_free_listing_as_private_paid(db_session):
    listing = await create_listing(
        db_session,
        user_id="user-1",
        pricing_tier="free",
        status="published",
        meta_json="{}",
    )

    inferred_policy = await MonetizationService(db_session).ensure_listing_pricing_metadata(listing)

    assert inferred_policy == "private_paid"
    meta = MonetizationService._parse_metadata(listing.meta_json)
    assert meta["_pricing_policy"] == "private_paid"
    assert meta["_pricing_backfill"]["source"] == "lazy_legacy_fallback"


@pytest.mark.asyncio
async def test_business_listing_requires_active_subscription(db_session):
    db_session.add(
        UserProfile(
            user_id="business-user",
            name="Business User",
            city="Madrid",
            bio="bio",
            preferred_language="en",
            account_type="business",
            onboarding_completed=True,
            is_public_profile=True,
            show_as_public_author=False,
            allow_marketing_emails=False,
        )
    )
    db_session.add(
        BusinessProfile(
            owner_user_id="business-user",
            slug="biz-one",
            name="Biz One",
            category="Legal",
            city="Madrid",
            description="desc",
        )
    )
    await db_session.commit()

    listing = await create_listing(
        db_session,
        user_id="business-user",
        owner_type="business_profile",
        owner_id="biz-one",
        pricing_tier="business",
    )

    with pytest.raises(PaymentRequiredError) as exc_info:
        await ListingsService(db_session).submit_listing(listing.id)

    assert exc_info.value.product_code == "business_priority"
    assert exc_info.value.paywall_reason == "business_without_subscription"


@pytest.mark.asyncio
async def test_business_listing_quota_is_enforced_on_submit(db_session):
    now = datetime.now(timezone.utc)
    db_session.add(
        UserProfile(
            user_id="business-user",
            name="Business User",
            city="Madrid",
            bio="bio",
            preferred_language="en",
            account_type="business",
            onboarding_completed=True,
            is_public_profile=True,
            show_as_public_author=False,
            allow_marketing_emails=False,
        )
    )
    business = BusinessProfile(
        owner_user_id="business-user",
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
    )
    db_session.add(business)
    await db_session.flush()
    db_session.add(
        BillingSubscription(
            user_id="business-user",
            business_profile_id=business.id,
            plan_code="business_presence",
            status="active",
            provider="stripe",
            billing_cycle="monthly",
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            next_renewal_at=now + timedelta(days=30),
            cancel_at_period_end=False,
        )
    )
    await db_session.commit()

    for index in range(5):
        await create_listing(
            db_session,
            user_id="business-user",
            owner_type="business_profile",
            owner_id="biz-one",
            pricing_tier="business",
            status="published",
            title=f"Published {index}",
        )

    overflow_listing = await create_listing(
        db_session,
        user_id="business-user",
        owner_type="business_profile",
        owner_id="biz-one",
        pricing_tier="business",
        status="draft",
        title="Overflow",
    )

    with pytest.raises(ValueError, match="Listing limit reached for the current business plan"):
        await ListingsService(db_session).submit_listing(overflow_listing.id)


@pytest.mark.asyncio
async def test_expire_due_entities_clears_boost_state(db_session):
    now = datetime.now(timezone.utc)
    listing = await create_listing(db_session, user_id="user-1", pricing_tier="free", status="published")
    listing.visibility = "boosted"
    listing.is_promoted = True
    listing.ranking_score = 2000
    db_session.add(
        ListingPromotion(
            listing_id=listing.id,
            payment_id=None,
            promotion_type="boost",
            status="active",
            starts_at=now - timedelta(days=3),
            expires_at=now - timedelta(minutes=1),
        )
    )
    await db_session.commit()

    summary = await MonetizationService(db_session).expire_due_entities()
    refreshed_listing = await db_session.get(Listings, listing.id)

    assert summary["expired_promotions"] == 1
    assert refreshed_listing is not None
    assert refreshed_listing.visibility == "standard"
    assert refreshed_listing.is_promoted is False
    assert refreshed_listing.is_featured is False
    assert refreshed_listing.ranking_score == 0


@pytest.mark.asyncio
async def test_has_paid_listing_access_accepts_trial_extension_payment(db_session):
    listing = await create_listing(
        db_session,
        user_id="user-1",
        pricing_tier="basic",
        meta_json=MonetizationService.merge_listing_metadata(
            None,
            MonetizationService.build_listing_pricing_metadata(
                policy="private_paid",
                module="services",
                category="services",
            ),
        ),
    )
    now = datetime.now(timezone.utc)
    db_session.add(
        BillingPayment(
            user_id="user-1",
            listing_id=listing.id,
            provider="stripe",
            product_code="listing_extend_30",
            product_type="listing_purchase",
            target_type="listing",
            title="Complete 30 days",
            status="paid",
            entitlement_status="active",
            amount_total=Decimal("3.99"),
            currency="eur",
            checkout_mode="payment",
            period_start=now,
            period_end=now + timedelta(days=30),
            paid_at=now,
            metadata_json="{}",
        )
    )
    await db_session.commit()

    assert await MonetizationService(db_session).has_paid_listing_access(listing.id) is True


@pytest.mark.asyncio
async def test_expire_due_entities_clears_featured_state(db_session):
    now = datetime.now(timezone.utc)
    listing = await create_listing(db_session, user_id="user-1", pricing_tier="free", status="published")
    listing.visibility = "featured"
    listing.is_promoted = True
    listing.is_featured = True
    listing.ranking_score = 3000
    db_session.add(
        ListingPromotion(
            listing_id=listing.id,
            payment_id=None,
            promotion_type="featured",
            status="active",
            starts_at=now - timedelta(days=7),
            expires_at=now - timedelta(minutes=1),
        )
    )
    await db_session.commit()

    summary = await MonetizationService(db_session).expire_due_entities()
    refreshed_listing = await db_session.get(Listings, listing.id)

    assert summary["expired_promotions"] == 1
    assert refreshed_listing is not None
    assert refreshed_listing.visibility == "standard"
    assert refreshed_listing.is_promoted is False
    assert refreshed_listing.is_featured is False
    assert refreshed_listing.ranking_score == 0


@pytest.mark.asyncio
async def test_expire_due_entities_uses_explicit_as_of_and_reports_affected_ids(db_session):
    as_of = datetime(2026, 3, 26, 9, 0, tzinfo=timezone.utc)

    expired_listing = await create_listing(db_session, user_id="user-1", pricing_tier="free", status="published")
    expired_listing.expiry_date = as_of - timedelta(minutes=5)

    future_listing = await create_listing(db_session, user_id="user-2", pricing_tier="free", status="published")
    future_listing.expiry_date = as_of + timedelta(days=1)

    business = BusinessProfile(
        owner_user_id="business-user",
        slug="biz-expiring",
        name="Biz Expiring",
        category="services",
        city="Madrid",
        description="Long enough description",
        is_premium=True,
        subscription_plan="growth",
        subscription_renewal_date=as_of,
        listing_quota=20,
    )
    db_session.add(business)
    await db_session.flush()

    affected_business_listing = await create_listing(
        db_session,
        user_id="business-user",
        owner_type="business_profile",
        owner_id=business.slug,
        pricing_tier="business",
        status="published",
        title="Business listing",
    )

    subscription = BillingSubscription(
        user_id="business-user",
        business_profile_id=business.id,
        plan_code="growth",
        status="active",
        provider="stripe",
        billing_cycle="monthly",
        current_period_start=as_of - timedelta(days=30),
        current_period_end=as_of - timedelta(minutes=1),
    )
    db_session.add(subscription)
    await db_session.commit()

    summary = await MonetizationService(db_session).expire_due_entities(as_of=as_of)

    refreshed_expired_listing = await db_session.get(Listings, expired_listing.id)
    refreshed_future_listing = await db_session.get(Listings, future_listing.id)
    refreshed_subscription = await db_session.get(BillingSubscription, subscription.id)
    refreshed_business = await db_session.get(BusinessProfile, business.id)

    assert summary["as_of"] == as_of.isoformat()
    assert summary["expired_listings"] == 1
    assert summary["expired_listing_ids"] == [expired_listing.id]
    assert summary["expired_subscriptions"] == 1
    assert summary["expired_subscription_ids"] == [subscription.id]
    assert affected_business_listing.id in summary["affected_listing_ids"]
    assert summary["affected_business_profile_ids"] == [business.id]

    assert refreshed_expired_listing is not None
    assert refreshed_expired_listing.status == "expired"
    assert refreshed_future_listing is not None
    assert refreshed_future_listing.status == "published"
    assert refreshed_subscription is not None
    assert refreshed_subscription.status == "expired"
    assert refreshed_business is not None
    assert refreshed_business.is_premium is False
    assert refreshed_business.subscription_plan is None
