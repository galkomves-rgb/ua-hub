from datetime import datetime, timezone
from decimal import Decimal
import sys
from types import ModuleType, SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_admin_user
from dependencies.database import get_db_session
from models.auth import User
from models.billing import BillingPayment
from models.listings import Listings
from models.messages import MessageReport
from models.profiles import BusinessProfile, UserProfile


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

from routers.admin_management import router as admin_management_router
from routers.billing import admin_router as admin_billing_router
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
    test_app.include_router(admin_management_router)
    test_app.include_router(admin_billing_router)

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
async def test_admin_reports_list_and_review(api_client: AsyncClient, db_session: AsyncSession):
    db_session.add_all([
        User(id="user-1", email="one@example.com", role="user"),
        User(id="user-2", email="two@example.com", role="user"),
    ])
    db_session.add(
        MessageReport(
            reporter_user_id="user-1",
            reported_user_id="user-2",
            listing_id="42",
            reason="spam",
            details="Repeated unsolicited messages",
            status="pending",
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/admin/reports", params={"status": "pending"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["reason"] == "spam"

    review_response = await api_client.post(
        f"/api/v1/admin/reports/{payload['items'][0]['id']}/review",
        json={"status": "reviewed", "moderation_note": "Escalated and documented"},
    )

    assert review_response.status_code == 200
    reviewed = review_response.json()
    assert reviewed["status"] == "reviewed"
    assert reviewed["moderation_note"] == "Escalated and documented"
    assert reviewed["reviewed_at"] is not None


@pytest.mark.asyncio
async def test_admin_users_list_and_role_update(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    db_session.add_all([
        User(id="user-1", email="one@example.com", name="One", role="user", created_at=now),
        User(id="admin-2", email="admin2@example.com", name="Two", role="admin", created_at=now),
        BusinessProfile(owner_user_id="user-1", slug="biz-1", name="Biz One", category="legal", city="Madrid", description="desc"),
        UserProfile(user_id="user-1", name="User One", city="Madrid", bio="", preferred_language="ua", account_type="private"),
    ])
    await db_session.commit()

    response = await api_client.get("/api/v1/admin/users", params={"role": "user"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["email"] == "one@example.com"
    assert payload["items"][0]["business_profiles_count"] == 1

    update_response = await api_client.put(
        "/api/v1/admin/users/user-1/role",
        json={"role": "admin"},
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["role"] == "admin"


@pytest.mark.asyncio
async def test_admin_billing_list_and_override(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    db_session.add(User(id="user-1", email="one@example.com", role="user", created_at=now))
    await db_session.flush()
    db_session.add(
        BillingPayment(
            user_id="user-1",
            provider="stripe",
            product_code="listing_basic",
            product_type="listing_purchase",
            target_type="listing",
            title="Pending payment",
            status="pending",
            entitlement_status="pending",
            amount_total=Decimal("9.99"),
            currency="eur",
            checkout_mode="payment",
            metadata_json="{}",
            created_at=now,
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/admin/billing/payments", params={"status": "pending"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    payment_id = payload["items"][0]["id"]
    assert payload["items"][0]["status"] == "pending"

    override_response = await api_client.post(
        f"/api/v1/admin/billing/payments/{payment_id}/override",
        json={"payment_status": "paid", "entitlement_status": "active", "note": "Manual recovery"},
    )

    assert override_response.status_code == 200
    overridden = override_response.json()
    assert overridden["status"] == "paid"
    assert overridden["entitlement_status"] == "active"
    assert overridden["paid_at"] is not None


@pytest.mark.asyncio
async def test_admin_business_detail_includes_full_profile_and_related_payments(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    db_session.add(User(id="user-1", email="owner@example.com", role="user", created_at=now))
    await db_session.flush()
    business = BusinessProfile(
        owner_user_id="user-1",
        slug="crypto-risk-app",
        name="Crypto Risk App",
        category="digital",
        city="Torrevieja",
        description="desc",
        logo_url="https://example.com/logo.png",
        cover_url="https://example.com/cover.png",
        contacts_json='{"email":"owner@example.com","website":"https://example.com"}',
        tags_json='["crypto","trading"]',
        website="https://example.com",
        social_links_json='["https://instagram.com/example"]',
        service_areas_json='["Torrevieja","Alicante"]',
        verification_status="pending",
        subscription_request_status="pending",
        subscription_requested_plan="business_priority",
        subscription_requested_at=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add(business)
    await db_session.flush()
    db_session.add(
        BillingPayment(
            user_id="user-1",
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
            receipt_url="https://example.com/receipt",
            invoice_url="https://example.com/invoice",
            metadata_json="{}",
            created_at=now,
            paid_at=now,
        )
    )
    await db_session.commit()

    response = await api_client.get("/api/v1/admin/business/crypto-risk-app")

    assert response.status_code == 200
    payload = response.json()
    assert payload["owner_email"] == "owner@example.com"
    assert payload["logo_url"] == "https://example.com/logo.png"
    assert payload["contacts_json"] == '{"email":"owner@example.com","website":"https://example.com"}'
    assert payload["public_preview_url"].endswith("/business/crypto-risk-app")
    assert len(payload["related_payments"]) == 1
    assert payload["related_payments"][0]["status"] == "paid"


@pytest.mark.asyncio
async def test_admin_subscription_review_requires_payment_or_manual_override(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    db_session.add(User(id="user-1", email="owner@example.com", role="user", created_at=now))
    db_session.add(
        BusinessProfile(
            owner_user_id="user-1",
            slug="biz-1",
            name="Biz One",
            category="legal",
            city="Madrid",
            description="desc",
            subscription_request_status="pending",
            subscription_requested_plan="business_priority",
            subscription_requested_at=now,
            created_at=now,
            updated_at=now,
        )
    )
    await db_session.commit()

    response = await api_client.post(
        "/api/v1/admin/business/biz-1/subscription-review",
        json={"decision": "approved", "plan": "business_priority"},
    )

    assert response.status_code == 400
    assert "successful payment" in response.json()["detail"]

    manual_response = await api_client.post(
        "/api/v1/admin/business/biz-1/subscription-review",
        json={
            "decision": "approved",
            "plan": "business_priority",
            "manual_override": True,
            "moderation_note": "User provided bank transfer confirmation after Stripe outage",
        },
    )

    assert manual_response.status_code == 200
    payload = manual_response.json()
    assert payload["subscription_plan"] == "business_priority"
    assert payload["subscription_request_status"] == "approved"


@pytest.mark.asyncio
async def test_admin_business_visibility_suspend_restore_delete(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    business = BusinessProfile(
        owner_user_id="user-1",
        slug="biz-visibility",
        name="Biz Visibility",
        category="legal",
        city="Madrid",
        description="desc",
        created_at=now,
        updated_at=now,
    )
    db_session.add(business)
    await db_session.commit()

    suspend_response = await api_client.post(
        "/api/v1/admin/business/biz-visibility/visibility",
        json={"action": "suspend", "moderation_note": "Complaints under review"},
    )
    assert suspend_response.status_code == 200
    assert suspend_response.json()["is_suspended"] is True

    restore_response = await api_client.post(
        "/api/v1/admin/business/biz-visibility/visibility",
        json={"action": "restore"},
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["is_suspended"] is False

    delete_response = await api_client.post(
        "/api/v1/admin/business/biz-visibility/visibility",
        json={"action": "delete", "moderation_note": "Fraud confirmed"},
    )
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True


@pytest.mark.asyncio
async def test_admin_listing_visibility_archive_restore_delete(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    listing = Listings(
        user_id="user-1",
        module="services",
        category="translation",
        title="Visible listing",
        description="Long enough description",
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
        expiry_date=now,
        status="published",
        is_featured=False,
        is_promoted=False,
        is_verified=False,
        moderation_reason=None,
        meta_json="{}",
        views_count=0,
        created_at=now,
        updated_at=now,
    )
    db_session.add(listing)
    await db_session.commit()
    await db_session.refresh(listing)

    archive_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/visibility",
        json={"action": "archive"},
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"

    restore_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/visibility",
        json={"action": "restore"},
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["status"] == "published"

    delete_response = await api_client.post(
        f"/api/v1/admin/listings/{listing.id}/visibility",
        json={"action": "delete"},
    )
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True
