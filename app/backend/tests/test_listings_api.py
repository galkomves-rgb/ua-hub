from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from models.billing import BillingPayment, BillingSubscription
from models.profiles import BusinessProfile, UserProfile
from routers.listings import router as listings_router
from services.listings_service import ListingsService


TEST_USER_ID = "user-1"


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession):
    test_app = FastAPI()
    test_app.include_router(listings_router)

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user_id() -> str:
        return TEST_USER_ID

    test_app.dependency_overrides[get_db_session] = override_get_db_session
    test_app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


async def create_listing(
    db_session: AsyncSession,
    *,
    user_id: str,
    owner_type: str = "private_user",
    owner_id: str | None = None,
    pricing_tier: str = "free",
    status: str = "draft",
    title: str = "Listing title",
):
    listing = await ListingsService(db_session).create_listing(
        user_id=user_id,
        module="services",
        category="services",
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
        meta_json="{}",
    )
    listing.status = status
    await db_session.commit()
    await db_session.refresh(listing)
    return listing


@pytest.mark.asyncio
async def test_legacy_create_endpoint_is_explicitly_disabled(api_client: AsyncClient):
    response = await api_client.post(
        "/api/v1/listings",
        json={
            "module": "services",
            "category": "services",
            "title": "Legacy listing",
            "description": "Long enough description",
            "price": None,
            "currency": "EUR",
            "city": "Madrid",
            "region": None,
            "owner_type": "private_user",
            "owner_id": TEST_USER_ID,
            "pricing_tier": "free",
            "visibility": "standard",
            "images_json": "[]",
            "meta_json": "{}",
        },
    )

    assert response.status_code == 410
    assert response.json()["detail"] == {
        "message": "Listing creation moved to /api/v1/listings/create",
        "canonical_endpoint": "/api/v1/listings/create",
        "paywall_flow": "create_paywall_submit",
    }


@pytest.mark.asyncio
async def test_submit_returns_402_for_second_free_listing(api_client: AsyncClient, db_session: AsyncSession):
    first_listing = await create_listing(db_session, user_id=TEST_USER_ID, pricing_tier="free", title="First")
    second_listing = await create_listing(db_session, user_id=TEST_USER_ID, pricing_tier="free", title="Second")

    first_response = await api_client.post(f"/api/v1/listings/{first_listing.id}/submit")
    assert first_response.status_code == 200

    second_response = await api_client.post(f"/api/v1/listings/{second_listing.id}/submit")

    assert second_response.status_code == 402
    assert second_response.json()["detail"] == {
        "message": "Choose Basic to keep publishing.",
        "required_product_code": "listing_basic",
        "paywall_reason": "free_listing_already_used",
        "listing_id": second_listing.id,
    }


@pytest.mark.asyncio
async def test_submit_returns_402_for_unpaid_basic_listing(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, user_id=TEST_USER_ID, pricing_tier="basic")

    response = await api_client.post(f"/api/v1/listings/{listing.id}/submit")

    assert response.status_code == 402
    assert response.json()["detail"] == {
        "message": "Complete payment to publish this listing.",
        "required_product_code": "listing_basic",
        "paywall_reason": "payment_required_for_basic_listing",
        "listing_id": listing.id,
    }


@pytest.mark.asyncio
async def test_submit_returns_402_for_business_listing_without_subscription(api_client: AsyncClient, db_session: AsyncSession):
    db_session.add(
        UserProfile(
            user_id=TEST_USER_ID,
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
            owner_user_id=TEST_USER_ID,
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
        user_id=TEST_USER_ID,
        owner_type="business_profile",
        owner_id="biz-one",
        pricing_tier="business",
    )

    response = await api_client.post(f"/api/v1/listings/{listing.id}/submit")

    assert response.status_code == 402
    assert response.json()["detail"] == {
        "message": "Activate a business plan to publish.",
        "required_product_code": "business_growth",
        "paywall_reason": "business_without_subscription",
        "listing_id": listing.id,
    }


@pytest.mark.asyncio
async def test_submit_returns_400_when_business_quota_is_exceeded(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    db_session.add(
        UserProfile(
            user_id=TEST_USER_ID,
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
        owner_user_id=TEST_USER_ID,
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
            user_id=TEST_USER_ID,
            business_profile_id=business.id,
            plan_code="starter",
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
            user_id=TEST_USER_ID,
            owner_type="business_profile",
            owner_id="biz-one",
            pricing_tier="business",
            status="published",
            title=f"Published {index}",
        )

    overflow_listing = await create_listing(
        db_session,
        user_id=TEST_USER_ID,
        owner_type="business_profile",
        owner_id="biz-one",
        pricing_tier="business",
        status="draft",
        title="Overflow",
    )

    response = await api_client.post(f"/api/v1/listings/{overflow_listing.id}/submit")

    assert response.status_code == 400
    assert response.json() == {"detail": "Listing limit reached for the current business plan"}


@pytest.mark.asyncio
async def test_submit_allows_paid_basic_listing(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, user_id=TEST_USER_ID, pricing_tier="basic")
    now = datetime.now(timezone.utc)
    db_session.add(
        BillingPayment(
            user_id=TEST_USER_ID,
            listing_id=listing.id,
            provider="stripe",
            product_code="listing_basic",
            product_type="listing_purchase",
            target_type="listing",
            title="Basic listing",
            status="paid",
            entitlement_status="active",
            amount_total=Decimal("1.99"),
            currency="eur",
            checkout_mode="payment",
            period_start=now,
            period_end=now + timedelta(days=7),
            paid_at=now,
            metadata_json="{}",
        )
    )
    await db_session.commit()

    response = await api_client.post(f"/api/v1/listings/{listing.id}/submit")

    assert response.status_code == 200
    assert response.json()["status"] == "moderation_pending"
    assert response.json()["id"] == listing.id
