from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.listings import Listings
from models.messages import Messages
from models.profiles import BusinessProfile
from models.saved import SavedListing


class AccountService:
    """Aggregate account-facing dashboard data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard(self, user_id: str) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        expiring_cutoff = now + timedelta(days=7)

        active_listings_count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.user_id == user_id,
                Listings.status.in_(("active", "published")),
            )
        )
        draft_listings_count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.user_id == user_id,
                Listings.status == "draft",
            )
        )
        saved_listings_count = await self.db.scalar(
            select(func.count(SavedListing.id)).where(SavedListing.user_id == user_id)
        )
        unread_messages_count = await self.db.scalar(
            select(func.count(Messages.id)).where(
                Messages.recipient_id == user_id,
                Messages.is_read.is_(False),
            )
        )
        business_profiles_count = await self.db.scalar(
            select(func.count(BusinessProfile.id)).where(BusinessProfile.owner_user_id == user_id)
        )
        expiring_soon_count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.user_id == user_id,
                Listings.status.in_(("active", "published")),
                Listings.expiry_date.is_not(None),
                Listings.expiry_date >= now,
                Listings.expiry_date <= expiring_cutoff,
            )
        )
        moderation_issues_count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.user_id == user_id,
                Listings.status == "rejected",
            )
        )

        return {
            "active_listings_count": active_listings_count or 0,
            "draft_listings_count": draft_listings_count or 0,
            "saved_listings_count": saved_listings_count or 0,
            "unread_messages_count": unread_messages_count or 0,
            "business_profiles_count": business_profiles_count or 0,
            "expiring_soon_count": expiring_soon_count or 0,
            "moderation_issues_count": moderation_issues_count or 0,
        }
