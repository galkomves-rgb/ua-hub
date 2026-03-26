from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from models.listings import Listings
from models.profiles import UserProfile
from models.saved import SavedListing
from routers.profiles import router as profiles_router
from routers.saved import router as saved_router
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
    test_app.include_router(saved_router)
    test_app.include_router(profiles_router)

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


async def create_listing(db_session: AsyncSession, *, title: str = "Painter in Valencia") -> Listings:
    listing = await ListingsService(db_session).create_listing(
        user_id=TEST_USER_ID,
        module="services",
        category="services",
        title=title,
        description="Long enough description",
        city="Valencia",
        owner_type="private_user",
        owner_id=TEST_USER_ID,
        pricing_tier="free",
        visibility="standard",
        ranking_score=0,
        expiry_date=datetime.now(timezone.utc) + timedelta(days=7),
        price="120 EUR",
        currency="EUR",
        subcategory=None,
        region=None,
        images_json='["https://example.com/listing-cover.jpg"]',
        meta_json="{}",
    )
    listing.status = "published"
    await db_session.commit()
    await db_session.refresh(listing)
    return listing


@pytest.mark.asyncio
async def test_list_saved_listings_returns_saved_cards(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session)
    saved_listing = SavedListing(
        user_id=TEST_USER_ID,
        listing_id=listing.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(saved_listing)
    await db_session.commit()

    response = await api_client.get("/api/v1/saved/listings")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["listing_id"] == listing.id
    assert body[0]["title"] == "Painter in Valencia"
    assert body[0]["city"] == "Valencia"
    assert body[0]["price"] == "120 EUR"
    assert body[0]["module"] == "services"
    assert body[0]["status"] == "published"
    assert body[0]["primary_image"] == "https://example.com/listing-cover.jpg"
    assert isinstance(body[0]["saved_at"], str)


@pytest.mark.asyncio
async def test_remove_saved_listing_deletes_saved_record(api_client: AsyncClient, db_session: AsyncSession):
    listing = await create_listing(db_session, title="Electrician in Madrid")
    db_session.add(
        SavedListing(
            user_id=TEST_USER_ID,
            listing_id=listing.id,
            created_at=datetime.now(timezone.utc),
        )
    )
    await db_session.commit()

    response = await api_client.delete(f"/api/v1/saved/listings/{listing.id}")

    assert response.status_code == 200
    assert response.json() == {"message": "Saved listing removed successfully"}

    saved_listing_result = await db_session.execute(
        select(SavedListing).where(
            SavedListing.user_id == TEST_USER_ID,
            SavedListing.listing_id == listing.id,
        )
    )
    assert saved_listing_result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_create_user_profile_persists_profile(api_client: AsyncClient, db_session: AsyncSession):
    response = await api_client.post(
        "/api/v1/profiles/user",
        json={
            "name": "Olena QA",
            "city": "Barcelona",
            "bio": "Community organizer",
            "preferred_language": "en",
            "account_type": "private",
            "avatar_url": None,
            "is_public_profile": True,
            "show_as_public_author": True,
            "allow_marketing_emails": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == TEST_USER_ID
    assert body["name"] == "Olena QA"
    assert body["city"] == "Barcelona"
    assert body["bio"] == "Community organizer"
    assert body["preferred_language"] == "en"
    assert body["account_type"] == "private"
    assert body["is_public_profile"] is True
    assert body["show_as_public_author"] is True
    assert body["allow_marketing_emails"] is True

    profile_result = await db_session.execute(
        select(UserProfile).where(UserProfile.user_id == TEST_USER_ID)
    )
    profile = profile_result.scalar_one()
    assert profile.name == "Olena QA"
    assert profile.city == "Barcelona"


@pytest.mark.asyncio
async def test_update_user_profile_updates_existing_profile(api_client: AsyncClient, db_session: AsyncSession):
    db_session.add(
        UserProfile(
            user_id=TEST_USER_ID,
            name="Initial Name",
            city="Madrid",
            bio="Initial bio",
            preferred_language="en",
            account_type="private",
            onboarding_completed=True,
            is_public_profile=False,
            show_as_public_author=False,
            allow_marketing_emails=False,
        )
    )
    await db_session.commit()

    response = await api_client.put(
        "/api/v1/profiles/user",
        json={
            "name": "Updated Name",
            "city": "Bilbao",
            "bio": "Updated bio",
            "preferred_language": "es",
            "avatar_url": "https://example.com/avatar.jpg",
            "is_public_profile": True,
            "show_as_public_author": True,
            "allow_marketing_emails": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Name"
    assert body["city"] == "Bilbao"
    assert body["bio"] == "Updated bio"
    assert body["preferred_language"] == "es"
    assert body["avatar_url"] == "https://example.com/avatar.jpg"
    assert body["is_public_profile"] is True
    assert body["show_as_public_author"] is True
    assert body["allow_marketing_emails"] is True
    assert body["account_type"] == "private"

    profile_result = await db_session.execute(
        select(UserProfile).where(UserProfile.user_id == TEST_USER_ID)
    )
    profile = profile_result.scalar_one()
    assert profile.name == "Updated Name"
    assert profile.city == "Bilbao"
    assert profile.bio == "Updated bio"
    assert profile.preferred_language == "es"
    assert profile.avatar_url == "https://example.com/avatar.jpg"
    assert profile.is_public_profile is True
    assert profile.show_as_public_author is True
    assert profile.allow_marketing_emails is True
