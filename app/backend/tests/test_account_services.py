from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.database import Base
from models.listings import Listings
from models.messages import Messages
from models.profiles import BusinessProfile, UserProfile
from models.saved import SavedListing
from services.account_service import AccountService
from services.profiles_service import ProfileService


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_account_dashboard_aggregates_only_current_user_data(db_session):
    now = datetime.now(timezone.utc)

    active_listing = Listings(
        user_id="user-1",
        module="jobs",
        category="jobs",
        title="Published listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Madrid",
        owner_type="private_user",
        owner_id="user-1",
        status="published",
        expiry_date=now + timedelta(days=3),
        created_at=now,
        updated_at=now,
    )
    draft_listing = Listings(
        user_id="user-1",
        module="services",
        category="services",
        title="Draft listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Valencia",
        owner_type="private_user",
        owner_id="user-1",
        status="draft",
        expiry_date=None,
        created_at=now,
        updated_at=now,
    )
    rejected_listing = Listings(
        user_id="user-1",
        module="housing",
        category="housing",
        title="Rejected listing",
        description="desc",
        price=None,
        currency="EUR",
        city="Malaga",
        owner_type="private_user",
        owner_id="user-1",
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
                owner_user_id="user-1",
                slug="biz-one",
                name="Biz One",
                category="Legal",
                city="Madrid",
                description="desc",
            ),
            Messages(
                user_id="user-2",
                recipient_id="user-1",
                listing_id=None,
                listing_title=None,
                content="Unread",
                is_read=False,
                created_at=now,
            ),
            Messages(
                user_id="user-2",
                recipient_id="user-1",
                listing_id=None,
                listing_title=None,
                content="Read",
                is_read=True,
                created_at=now,
            ),
            Messages(
                user_id="user-1",
                recipient_id="user-2",
                listing_id=None,
                listing_title=None,
                content="Outbound",
                is_read=False,
                created_at=now,
            ),
        ]
    )
    await db_session.flush()

    db_session.add(SavedListing(user_id="user-1", listing_id=active_listing.id))
    await db_session.commit()

    dashboard = await AccountService(db_session).get_dashboard("user-1")

    assert dashboard == {
        "active_listings_count": 1,
        "draft_listings_count": 1,
        "saved_listings_count": 1,
        "unread_messages_count": 1,
        "business_profiles_count": 1,
        "expiring_soon_count": 1,
        "moderation_issues_count": 1,
    }


@pytest.mark.asyncio
async def test_onboarding_status_reflects_profile_and_business_progress(db_session):
    service = ProfileService(db_session)

    empty_status = await service.get_onboarding_status("user-1")

    assert empty_status == {
        "completed": False,
        "has_user_profile": False,
        "has_business_profile": False,
        "account_type": None,
        "next_step": "user_profile",
    }

    db_session.add(
        UserProfile(
            user_id="user-1",
            name="Olena",
            city="Barcelona",
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
            owner_user_id="user-1",
            slug="olena-studio",
            name="Olena Studio",
            category="Design",
            city="Barcelona",
            description="desc",
        )
    )
    await db_session.commit()

    completed_status = await service.get_onboarding_status("user-1")

    assert completed_status == {
        "completed": True,
        "has_user_profile": True,
        "has_business_profile": True,
        "account_type": "business",
        "next_step": "done",
    }
