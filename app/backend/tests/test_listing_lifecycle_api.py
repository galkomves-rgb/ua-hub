from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_admin_user, get_current_user_id
from dependencies.database import get_db_session
from models.billing import BillingPayment
from routers.listings import admin_router as listings_admin_router
from routers.listings import router as listings_router
from schemas.auth import UserResponse
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
    test_app.include_router(listings_admin_router)

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user_id() -> str:
        return TEST_USER_ID

    async def override_get_admin_user() -> UserResponse:
        return UserResponse(id="admin-1", email="admin@example.com", name="Admin", role="admin")

    test_app.dependency_overrides[get_db_session] = override_get_db_session
    test_app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    test_app.dependency_overrides[get_admin_user] = override_get_admin_user

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


async def create_listing(
    db_session: AsyncSession,
    *,
    status: str = "draft",
    title: str = "Listing title",
    pricing_tier: str = "free",
):
    listing = await ListingsService(db_session).create_listing(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title=title,
        description="Long enough description",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
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
async def test_submit_then_approve_lifecycle_via_api(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, status="draft")

    submit_response = await api_client.post(f"/api/v1/listings/{listing.id}/submit")
    assert submit_response.status_code == 200
    assert submit_response.json() == {"id": listing.id, "status": "moderation_pending"}

    approve_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/moderate",
        json={"decision": "approve", "moderation_reason": None, "category": "services", "badges": []},
    )
    assert approve_response.status_code == 200
    assert approve_response.json() == {"id": listing.id, "status": "published"}


@pytest.mark.asyncio
async def test_reject_then_resubmit_lifecycle_via_api(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, status="draft")

    await api_client.post(f"/api/v1/listings/{listing.id}/submit")
    reject_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/moderate",
        json={"decision": "reject", "moderation_reason": "Wrong category", "category": "services", "badges": []},
    )
    assert reject_response.status_code == 200
    assert reject_response.json() == {"id": listing.id, "status": "rejected"}

    resubmit_response = await api_client.post(f"/api/v1/listings/{listing.id}/submit")
    assert resubmit_response.status_code == 200
    assert resubmit_response.json() == {"id": listing.id, "status": "moderation_pending"}


@pytest.mark.asyncio
async def test_archive_then_renew_lifecycle_via_api(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, status="published")

    archive_response = await api_client.post(f"/api/v1/listings/{listing.id}/archive")
    assert archive_response.status_code == 200
    assert archive_response.json() == {"id": listing.id, "status": "archived"}

    renew_response = await api_client.post(f"/api/v1/listings/{listing.id}/renew")
    assert renew_response.status_code == 200
    assert renew_response.json() == {"id": listing.id, "status": "draft"}


@pytest.mark.asyncio
async def test_invalid_lifecycle_transitions_are_blocked_via_api(api_client: AsyncClient, db_session: AsyncSession):
    published_listing = await create_listing(db_session, status="published", title="Published")
    draft_listing = await create_listing(db_session, status="draft", title="Draft")

    submit_published_response = await api_client.post(f"/api/v1/listings/{published_listing.id}/submit")
    assert submit_published_response.status_code == 400
    assert submit_published_response.json() == {"detail": "Listing cannot be submitted in its current state"}

    renew_draft_response = await api_client.post(f"/api/v1/listings/{draft_listing.id}/renew")
    assert renew_draft_response.status_code == 400
    assert renew_draft_response.json() == {"detail": "Listing cannot be renewed in its current state"}

    moderate_draft_response = await api_client.post(
        f"/api/v1/admin/listings/{draft_listing.id}/moderate",
        json={"decision": "approve", "moderation_reason": None, "category": "services", "badges": []},
    )
    assert moderate_draft_response.status_code == 400
    assert moderate_draft_response.json() == {"detail": "Only listings in moderation can be moderated"}

    moderation_listing = await create_listing(
        db_session,
        status="draft",
        title="Needs rejection reason",
        pricing_tier="basic",
    )
    now = datetime.now(timezone.utc)
    db_session.add(
        BillingPayment(
            user_id=TEST_USER_ID,
            listing_id=moderation_listing.id,
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
    await api_client.post(f"/api/v1/listings/{moderation_listing.id}/submit")

    reject_without_reason_response = await api_client.post(
        f"/api/v1/admin/listings/{moderation_listing.id}/moderate",
        json={"decision": "reject", "moderation_reason": None, "category": "services", "badges": []},
    )
    assert reject_without_reason_response.status_code == 400
    assert reject_without_reason_response.json() == {"detail": "Moderation reason is required when rejecting a listing"}


@pytest.mark.asyncio
async def test_admin_catalog_filters_listings(api_client: AsyncClient, db_session: AsyncSession):
    published_listing = await create_listing(db_session, status="published", title="Published plumbing")
    rejected_listing = await create_listing(db_session, status="rejected", title="Rejected cleaning")

    response = await api_client.get(
        "/api/v1/admin/listings/catalog",
        params={"status": "rejected", "q": "cleaning", "module": "services"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == rejected_listing.id
    assert payload[0]["title"] == rejected_listing.title
    assert payload[0]["status"] == "rejected"
    assert published_listing.id != rejected_listing.id


@pytest.mark.asyncio
async def test_moderation_audit_is_recorded(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, status="draft", title="Audit me")

    await api_client.post(f"/api/v1/listings/{listing.id}/submit")
    moderate_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/moderate",
        json={"decision": "reject", "moderation_reason": "Wrong category", "module": "services", "category": "services", "badges": ["featured"]},
    )

    assert moderate_response.status_code == 200

    audit_response = await api_client.get(f"/api/v1/admin/listings/{listing.id}/audit")
    assert audit_response.status_code == 200

    payload = audit_response.json()
    assert len(payload) == 1
    assert payload[0]["action"] == "moderation_rejected"
    assert payload[0]["from_status"] == "moderation_pending"
    assert payload[0]["to_status"] == "rejected"
    assert payload[0]["notes"] == "Wrong category"
    assert payload[0]["metadata"]["next_badges"] == ["featured"]
