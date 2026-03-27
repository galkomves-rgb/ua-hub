import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user, get_current_user_id
from dependencies.database import get_db_session
from models.billing import BillingPayment
from models.listings import Listings
from models.profiles import BusinessProfile
from schemas.auth import UserResponse

sys.modules.setdefault("stripe", SimpleNamespace())

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
        subscription_plan="business_growth",
        subscription_renewal_date=now + timedelta(days=30),
        listing_quota=20,
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
            product_code="business_growth",
            product_type="business_subscription",
            target_type="business_profile",
            title="Growth",
            status="paid",
            entitlement_status="active",
            amount_total=Decimal("24.00"),
            currency="eur",
            checkout_mode="subscription",
            period_start=now,
            period_end=now + timedelta(days=30),
            paid_at=now,
            metadata_json="{}",
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/billing/overview")

    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "eur"
    assert body["usage"]["active_listings_count"] == 1
    assert body["usage"]["total_listing_quota"] == 20
    assert body["payment_summary"]["paid_payments_count"] == 1
    assert body["payment_summary"]["total_spend"] == 24.0
    assert any(item["code"] == "business_growth" for item in body["available_products"])
    assert body["business_subscriptions"][0]["slug"] == "biz-one"
    assert body["business_subscriptions"][0]["active_listings_count"] == 1


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
        json={"product_code": "listing_basic", "listing_id": listing.id},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Stripe is not configured. Set STRIPE_SECRET_KEY before starting checkout."
    }