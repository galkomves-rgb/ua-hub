from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from models.listings import Listings
from services.listings_service import ListingsService
from services.monetization import MonetizationService


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


async def create_listing(
    db_session: AsyncSession,
    *,
    user_id: str = TEST_USER_ID,
    pricing_tier: str = "free",
    status: str = "draft",
    title: str = "Listing title",
    expiry_date=None,
):
    listing = await ListingsService(db_session).create_listing(
        user_id=user_id,
        module="services",
        category="services",
        title=title,
        description="Long enough description",
        city="Madrid",
        owner_type="private_user",
        owner_id=user_id,
        pricing_tier=pricing_tier,
        visibility="standard",
        ranking_score=0,
        expiry_date=expiry_date or (datetime.now(timezone.utc) + timedelta(days=7)),
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
async def test_draft_submit_then_approve_publishes_listing(db_session: AsyncSession):
    listing = await create_listing(db_session, status="draft")
    service = ListingsService(db_session)

    submitted = await service.submit_listing(listing.id)
    assert submitted is not None
    assert submitted.status == "moderation_pending"

    approved = await service.moderate_listing(listing.id, decision="approve")
    assert approved is not None
    assert approved.status == "published"
    assert approved.moderation_reason is None


@pytest.mark.asyncio
async def test_reject_then_resubmit_returns_listing_to_moderation(db_session: AsyncSession):
    listing = await create_listing(db_session, status="draft")
    service = ListingsService(db_session)

    await service.submit_listing(listing.id)
    rejected = await service.moderate_listing(listing.id, decision="reject", moderation_reason="Missing details")
    assert rejected is not None
    assert rejected.status == "rejected"
    assert rejected.moderation_reason == "Missing details"

    resubmitted = await service.submit_listing(listing.id)
    assert resubmitted is not None
    assert resubmitted.status == "moderation_pending"
    assert resubmitted.moderation_reason is None


@pytest.mark.asyncio
async def test_expire_due_entities_marks_published_listing_expired(db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    published_listing = await create_listing(
        db_session,
        status="published",
        title="Published listing",
        expiry_date=now - timedelta(minutes=1),
    )
    draft_listing = await create_listing(
        db_session,
        status="draft",
        title="Draft listing",
        expiry_date=now - timedelta(minutes=1),
    )

    summary = await MonetizationService(db_session).expire_due_entities()
    refreshed_published = await db_session.get(Listings, published_listing.id)
    refreshed_draft = await db_session.get(Listings, draft_listing.id)

    assert summary["expired_listings"] == 1
    assert refreshed_published is not None
    assert refreshed_published.status == "expired"
    assert refreshed_draft is not None
    assert refreshed_draft.status == "draft"


@pytest.mark.asyncio
async def test_archive_then_renew_restores_draft(db_session: AsyncSession):
    listing = await create_listing(db_session, status="published")
    service = ListingsService(db_session)

    archived = await service.archive_listing(listing.id)
    assert archived is not None
    assert archived.status == "archived"

    renewed = await service.renew_listing(listing.id)
    assert renewed is not None
    assert renewed.status == "draft"
    assert renewed.moderation_reason is None


@pytest.mark.asyncio
async def test_invalid_lifecycle_transitions_are_blocked(db_session: AsyncSession):
    service = ListingsService(db_session)
    published_listing = await create_listing(db_session, status="published", title="Published")
    draft_listing = await create_listing(db_session, status="draft", title="Draft")
    archived_listing = await create_listing(db_session, status="archived", title="Archived")

    assert await service.submit_listing(published_listing.id) is None
    assert await service.renew_listing(draft_listing.id) is None
    assert await service.archive_listing(archived_listing.id) is None

    with pytest.raises(ValueError, match="Only listings in moderation can be moderated"):
        await service.moderate_listing(draft_listing.id, decision="approve")

    moderation_listing = await create_listing(
        db_session,
        user_id="user-2",
        status="draft",
        title="Needs moderation",
    )
    await service.submit_listing(moderation_listing.id)

    with pytest.raises(ValueError, match="Moderation reason is required when rejecting a listing"):
        await service.moderate_listing(moderation_listing.id, decision="reject")
