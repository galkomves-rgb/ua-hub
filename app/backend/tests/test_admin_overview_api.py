from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_admin_user
from dependencies.database import get_db_session
from models.auth import User
from models.billing import BillingPayment, BillingSubscription
from models.listings import Listings
from models.messages import MessageReport
from models.profiles import BusinessProfile
from routers.admin_overview import router as admin_overview_router
from schemas.auth import UserResponse


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
    test_app.include_router(admin_overview_router)

    async def override_get_db_session():
        yield db_session

    async def override_get_admin_user() -> UserResponse:
        return UserResponse(id="admin-1", email="admin@example.com", name="Admin", role="admin")

    test_app.dependency_overrides[get_db_session] = override_get_db_session
    test_app.dependency_overrides[get_admin_user] = override_get_admin_user

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_overview_returns_aggregated_counts(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)

    db_session.add(User(id="user-1", email="one@example.com", role="user"))
    db_session.add(User(id="user-2", email="two@example.com", role="user"))
    db_session.add(BusinessProfile(owner_user_id="user-1", slug="biz-1", name="Biz One", category="legal", city="Madrid", description="desc"))
    await db_session.flush()

    db_session.add_all([
        Listings(
            user_id="user-1",
            module="services",
            category="translation",
            title="Pending listing",
            description="desc",
            price=None,
            currency="EUR",
            city="Madrid",
            region=None,
            owner_type="private_user",
            owner_id="user-1",
            pricing_tier="free",
            visibility="standard",
            ranking_score=0,
            badges="[]",
            images_json="[]",
            expiry_date=now + timedelta(days=7),
            status="moderation_pending",
            is_featured=False,
            is_promoted=False,
            is_verified=False,
            moderation_reason=None,
            meta_json="{}",
            views_count=0,
            created_at=now,
            updated_at=now,
        ),
        Listings(
            user_id="user-2",
            module="jobs",
            category="vacancies",
            title="Rejected listing",
            description="desc",
            price=None,
            currency="EUR",
            city="Barcelona",
            region=None,
            owner_type="private_user",
            owner_id="user-2",
            pricing_tier="free",
            visibility="standard",
            ranking_score=0,
            badges="[]",
            images_json="[]",
            expiry_date=now + timedelta(days=7),
            status="rejected",
            is_featured=False,
            is_promoted=False,
            is_verified=False,
            moderation_reason="bad",
            meta_json="{}",
            views_count=0,
            created_at=now,
            updated_at=now,
        ),
        Listings(
            user_id="user-2",
            module="housing",
            category="room-rent",
            title="Published listing",
            description="desc",
            price=None,
            currency="EUR",
            city="Valencia",
            region=None,
            owner_type="private_user",
            owner_id="user-2",
            pricing_tier="free",
            visibility="standard",
            ranking_score=0,
            badges="[]",
            images_json="[]",
            expiry_date=now + timedelta(days=7),
            status="published",
            is_featured=False,
            is_promoted=False,
            is_verified=False,
            moderation_reason=None,
            meta_json="{}",
            views_count=0,
            created_at=now,
            updated_at=now,
        ),
    ])
    db_session.add(MessageReport(reporter_user_id="user-1", reported_user_id="user-2", listing_id="1", reason="spam", status="pending"))
    db_session.add(BillingPayment(
        user_id="user-1",
        provider="stripe",
        product_code="listing_basic",
        product_type="listing_purchase",
        target_type="listing",
        title="Pending payment",
        status="pending",
        entitlement_status="pending",
        amount_total=Decimal("1.99"),
        currency="eur",
        checkout_mode="payment",
        metadata_json="{}",
    ))
    db_session.add(BillingPayment(
        user_id="user-2",
        provider="stripe",
        product_code="listing_basic",
        product_type="listing_purchase",
        target_type="listing",
        title="Failed payment",
        status="failed",
        entitlement_status="revoked",
        amount_total=Decimal("4.99"),
        currency="eur",
        checkout_mode="payment",
        failure_reason="card_declined",
        metadata_json="{}",
    ))
    db_session.add(BillingSubscription(
        user_id="user-1",
        business_profile_id=1,
        plan_code="growth",
        status="active",
        provider="stripe",
        billing_cycle="monthly",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
        next_renewal_at=now + timedelta(days=30),
        cancel_at_period_end=False,
    ))
    await db_session.commit()

    response = await api_client.get("/api/v1/admin/overview")

    assert response.status_code == 200
    body = response.json()
    assert body["counts"]["moderation_pending_count"] == 1
    assert body["counts"]["rejected_listings_count"] == 1
    assert body["counts"]["published_listings_count"] == 1
    assert body["counts"]["total_users_count"] == 2
    assert body["counts"]["suspended_business_profiles_count"] == 0
    assert body["counts"]["open_reports_count"] == 1
    assert body["counts"]["pending_payments_count"] == 1
    assert body["counts"]["payment_issues_count"] == 1
    assert body["counts"]["active_subscriptions_count"] == 1
    assert len(body["recent_pending_listings"]) == 1
    assert len(body["recent_reports"]) == 1
    assert len(body["recent_payment_issues"]) == 1
