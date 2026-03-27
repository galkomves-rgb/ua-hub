from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from models.listings import Listings
from models.messages import Messages
from models.profiles import BusinessProfile
from models.saved import SavedListing
from routers.account import router as account_router


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
    test_app.include_router(account_router)

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


@pytest.mark.asyncio
async def test_account_dashboard_route_returns_current_user_counts(api_client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(timezone.utc)

    active_listing = Listings(
        user_id=TEST_USER_ID,
        module="jobs",
        category="jobs",
        title="Published listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        status="published",
        expiry_date=now + timedelta(days=3),
        created_at=now,
        updated_at=now,
    )
    draft_listing = Listings(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title="Draft listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Valencia",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        status="draft",
        expiry_date=None,
        created_at=now,
        updated_at=now,
    )
    rejected_listing = Listings(
        user_id=TEST_USER_ID,
        module="housing",
        category="housing",
        title="Rejected listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Malaga",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        status="rejected",
        expiry_date=None,
        created_at=now,
        updated_at=now,
    )
    foreign_listing = Listings(
        user_id="user-2",
        module="jobs",
        category="jobs",
        title="Other user listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Seville",
        owner_type="private_user",
        owner_id="user-2",
        status="published",
        expiry_date=now + timedelta(days=2),
        created_at=now,
        updated_at=now,
    )

    db_session.add_all(
        [
            active_listing,
            draft_listing,
            rejected_listing,
            foreign_listing,
            BusinessProfile(
                owner_user_id=TEST_USER_ID,
                slug="biz-one",
                name="Biz One",
                category="Legal",
                city="Madrid",
                description="desc",
            ),
            Messages(
                user_id="user-2",
                recipient_id=TEST_USER_ID,
                listing_id=None,
                listing_title=None,
                content="Unread",
                is_read=False,
                created_at=now,
            ),
            Messages(
                user_id="user-2",
                recipient_id=TEST_USER_ID,
                listing_id=None,
                listing_title=None,
                content="Read",
                is_read=True,
                created_at=now,
            ),
        ]
    )
    await db_session.flush()

    db_session.add(SavedListing(user_id=TEST_USER_ID, listing_id=active_listing.id))
    await db_session.commit()

    response = await api_client.get("/api/v1/account/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "active_listings_count": 1,
        "draft_listings_count": 1,
        "saved_listings_count": 1,
        "unread_messages_count": 1,
        "business_profiles_count": 1,
        "expiring_soon_count": 1,
        "moderation_issues_count": 1,
    }