import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import ModuleType, SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user, get_current_user_id
from dependencies.database import get_db_session
from models.billing import BillingEntitlement, BillingPayment, BillingSubscription
from models.listings import Listings
from models.monetization import ListingPromotion
from models.profiles import BusinessProfile
from schemas.auth import UserResponse

if "stripe" not in sys.modules:
    stripe_module = ModuleType("stripe")

    class StripeError(Exception):
        pass

    class AuthenticationError(StripeError):
        pass

    class APIConnectionError(StripeError):
        pass

    class APIError(StripeError):
        pass

    class InvalidRequestError(StripeError):
        pass

    class CardError(StripeError):
        pass

    class RateLimitError(StripeError):
        pass

    class IdempotencyError(StripeError):
        pass

    class Account:
        @staticmethod
        async def retrieve_async():
            return {"id": "acct_test"}

    class CheckoutSession:
        @staticmethod
        async def create_async(**_kwargs):
            return SimpleNamespace(id="sess_test", url="https://example.com/checkout", client_secret=None)

        @staticmethod
        async def retrieve_async(_session_id):
            return SimpleNamespace(status="complete", payment_status="paid", amount_total=999, currency="eur", metadata={})

    stripe_module.api_key = ""
    stripe_module.error = SimpleNamespace(
        StripeError=StripeError,
        AuthenticationError=AuthenticationError,
        APIConnectionError=APIConnectionError,
        APIError=APIError,
        InvalidRequestError=InvalidRequestError,
        CardError=CardError,
        RateLimitError=RateLimitError,
        IdempotencyError=IdempotencyError,
    )
    stripe_module.Account = Account
    stripe_module.checkout = SimpleNamespace(Session=CheckoutSession)
    sys.modules["stripe"] = stripe_module

import services.billing as billing_module
from routers.billing import router as billing_router


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
    test_app.include_router(billing_router)

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user_id() -> str:
        return TEST_USER_ID

    async def override_get_current_user() -> UserResponse:
        return UserResponse(id=TEST_USER_ID, email="user@example.com", name="User", role="user")

    test_app.dependency_overrides[get_db_session] = override_get_db_session
    test_app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    test_app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_billing_overview_returns_usage_products_and_history_summary(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)

    business = BusinessProfile(
        owner_user_id=TEST_USER_ID,
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
        subscription_plan="business_priority",
        subscription_renewal_date=now + timedelta(days=30),
        listing_quota=1,
        is_premium=True,
    )
    db_session.add(business)
    await db_session.flush()

    listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Published listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="business_profile",
        owner_id="biz-one",
        status="published",
        expiry_date=now + timedelta(days=7),
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.flush()

    db_session.add(
        BillingPayment(
            user_id=TEST_USER_ID,
            business_profile_id=business.id,
            provider="stripe",
            product_code="business_priority",
            product_type="business_subscription",
            target_type="business_profile",
            title="Business Priority",
            status="paid",
            entitlement_status="active",
            amount_total=Decimal("19.99"),
            currency="eur",
            checkout_mode="subscription",
            period_start=now,
            period_end=now + timedelta(days=30),
            paid_at=now,
            metadata_json="{}",
        )
    )
    db_session.add(
        BillingSubscription(
            user_id=TEST_USER_ID,
            business_profile_id=business.id,
            plan_code="business_priority",
            status="active",
            provider="stripe",
            billing_cycle="monthly",
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            next_renewal_at=now + timedelta(days=30),
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/billing/overview")

    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "eur"
    assert body["usage"]["active_listings_count"] == 1
    assert body["usage"]["total_listing_quota"] == 1
    assert body["payment_summary"]["paid_payments_count"] == 1
    assert body["payment_summary"]["total_spend"] == 19.99
    assert any(item["code"] == "business_priority" for item in body["available_products"])
    assert body["business_subscriptions"][0]["slug"] == "biz-one"
    assert body["business_subscriptions"][0]["active_listings_count"] == 1


@pytest.mark.asyncio
async def test_billing_overview_returns_boost_roi_metrics(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Boosted listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        pricing_tier="basic",
        status="published",
        views_count=42,
        expiry_date=now + timedelta(days=14),
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.flush()

    payment = BillingPayment(
        user_id=TEST_USER_ID,
        listing_id=listing.id,
        provider="stripe",
        product_code="boost",
        product_type="listing_promotion",
        target_type="listing",
        title="Boost",
        status="paid",
        entitlement_status="active",
        amount_total=Decimal("2.99"),
        currency="eur",
        checkout_mode="payment",
        period_start=now,
        period_end=now + timedelta(days=3),
        paid_at=now,
        metadata_json='{"baseline_views_count": 10}',
    )
    db_session.add(payment)
    await db_session.flush()

    db_session.add(
        BillingEntitlement(
            user_id=TEST_USER_ID,
            payment_id=payment.id,
            listing_id=listing.id,
            entitlement_type="boost",
            status="active",
            starts_at=now,
            ends_at=now + timedelta(days=3),
            metadata_json='{"baseline_views_count": 10}',
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/billing/overview")

    assert response.status_code == 200
    boost = response.json()["active_boosts"][0]
    assert boost["baseline_views_count"] == 10
    assert boost["current_views_count"] == 42
    assert boost["gained_views_count"] == 32


@pytest.mark.asyncio
async def test_billing_checkout_returns_clear_error_when_stripe_is_not_configured(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Needs payment",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        status="draft",
        expiry_date=now + timedelta(days=7),
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.commit()

    response = await api_client.post(
        "/api/v1/billing/checkout",
        json={"product_code": "next_private_listing_30", "listing_id": listing.id},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Stripe is not configured. Set STRIPE_SECRET_KEY before starting checkout."
    }


@pytest.mark.asyncio
async def test_billing_checkout_returns_clear_error_when_subscription_price_id_is_missing(
    api_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    business = BusinessProfile(
        owner_user_id=TEST_USER_ID,
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
    )
    db_session.add(business)
    await db_session.commit()

    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")

    response = await api_client.post(
        "/api/v1/billing/checkout",
        json={"product_code": "business_presence", "business_slug": "biz-one"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Stripe Price ID is not configured for subscription product 'business_presence'"
    }


@pytest.mark.asyncio
async def test_billing_checkout_rejects_boost_for_free_listing(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Free listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        pricing_tier="free",
        status="published",
        expiry_date=now + timedelta(days=7),
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.commit()

    response = await api_client.post(
        "/api/v1/billing/checkout",
        json={"product_code": "boost", "listing_id": listing.id},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Promotions are available only for paid private listings"}


@pytest.mark.asyncio
async def test_billing_checkout_rejects_duplicate_active_boost(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Boosted listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        pricing_tier="basic",
        status="published",
        expiry_date=now + timedelta(days=30),
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.flush()
    payment = BillingPayment(
        user_id=TEST_USER_ID,
        listing_id=listing.id,
        provider="stripe",
        product_code="boost",
        product_type="listing_promotion",
        target_type="listing",
        title="Boost",
        status="paid",
        entitlement_status="active",
        amount_total=Decimal("2.99"),
        currency="eur",
        checkout_mode="payment",
        period_start=now,
        period_end=now + timedelta(days=3),
        paid_at=now,
        metadata_json="{}",
    )
    db_session.add(payment)
    await db_session.flush()
    db_session.add(
        ListingPromotion(
            listing_id=listing.id,
            payment_id=payment.id,
            promotion_type="boost",
            status="active",
            starts_at=now,
            expires_at=now + timedelta(days=3),
        )
    )
    await db_session.commit()

    response = await api_client.post(
        "/api/v1/billing/checkout",
        json={"product_code": "boost", "listing_id": listing.id},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "This promotion is already active for the selected listing"}
