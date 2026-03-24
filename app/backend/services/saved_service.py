import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.listings import Listings
from models.profiles import BusinessProfile
from models.saved import SavedBusiness, SavedListing, SearchAlert


class SavedTargetNotFoundError(ValueError):
    """Raised when a save target does not exist."""


class SavedService:
    """Manage saved entities and alerts for account cabinet flows."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _extract_primary_image(images_json: str | None) -> str | None:
        if not images_json:
            return None
        try:
            parsed = json.loads(images_json)
        except (TypeError, ValueError):
            return None

        if isinstance(parsed, list) and parsed:
            first_image = parsed[0]
            return first_image if isinstance(first_image, str) else None
        if isinstance(parsed, str):
            return parsed
        return None

    async def list_saved_listings(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            select(SavedListing, Listings)
            .join(Listings, Listings.id == SavedListing.listing_id)
            .where(SavedListing.user_id == user_id)
            .order_by(SavedListing.created_at.desc())
        )
        items: list[dict] = []
        for saved_listing, listing in result.all():
            items.append(
                {
                    "listing_id": listing.id,
                    "title": listing.title,
                    "city": listing.city,
                    "price": listing.price,
                    "module": listing.module,
                    "saved_at": saved_listing.created_at,
                    "status": listing.status,
                    "primary_image": self._extract_primary_image(listing.images_json),
                }
            )
        return items

    async def save_listing(self, user_id: str, listing_id: int) -> SavedListing:
        listing_result = await self.db.execute(select(Listings.id).where(Listings.id == listing_id))
        if listing_result.scalar_one_or_none() is None:
            raise SavedTargetNotFoundError("Listing not found")

        existing = await self.db.execute(
            select(SavedListing).where(
                SavedListing.user_id == user_id,
                SavedListing.listing_id == listing_id,
            )
        )
        record = existing.scalar_one_or_none()
        if record:
            return record

        record = SavedListing(user_id=user_id, listing_id=listing_id)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def remove_saved_listing(self, user_id: str, listing_id: int) -> bool:
        result = await self.db.execute(
            select(SavedListing).where(
                SavedListing.user_id == user_id,
                SavedListing.listing_id == listing_id,
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            return False

        await self.db.delete(record)
        await self.db.commit()
        return True

    async def list_saved_businesses(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            select(SavedBusiness, BusinessProfile)
            .join(BusinessProfile, BusinessProfile.id == SavedBusiness.business_profile_id)
            .where(SavedBusiness.user_id == user_id)
            .order_by(SavedBusiness.created_at.desc())
        )
        items: list[dict] = []
        for saved_business, business in result.all():
            items.append(
                {
                    "business_id": business.id,
                    "business_name": business.name,
                    "category": business.category,
                    "city": business.city,
                    "is_verified": business.is_verified,
                    "is_premium": business.is_premium,
                    "saved_at": saved_business.created_at,
                    "logo_url": business.logo_url,
                }
            )
        return items

    async def save_business(self, user_id: str, business_profile_id: int) -> SavedBusiness:
        business_result = await self.db.execute(
            select(BusinessProfile.id).where(BusinessProfile.id == business_profile_id)
        )
        if business_result.scalar_one_or_none() is None:
            raise SavedTargetNotFoundError("Business profile not found")

        existing = await self.db.execute(
            select(SavedBusiness).where(
                SavedBusiness.user_id == user_id,
                SavedBusiness.business_profile_id == business_profile_id,
            )
        )
        record = existing.scalar_one_or_none()
        if record:
            return record

        record = SavedBusiness(user_id=user_id, business_profile_id=business_profile_id)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def remove_saved_business(self, user_id: str, business_profile_id: int) -> bool:
        result = await self.db.execute(
            select(SavedBusiness).where(
                SavedBusiness.user_id == user_id,
                SavedBusiness.business_profile_id == business_profile_id,
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            return False

        await self.db.delete(record)
        await self.db.commit()
        return True

    async def list_search_alerts(self, user_id: str) -> list[SearchAlert]:
        result = await self.db.execute(
            select(SearchAlert)
            .where(SearchAlert.user_id == user_id)
            .order_by(SearchAlert.updated_at.desc())
        )
        return result.scalars().all()

    async def create_search_alert(
        self,
        user_id: str,
        query: str,
        module: str | None,
        city: str | None,
        filters_json: str,
        email_alerts_enabled: bool,
    ) -> SearchAlert:
        now = datetime.now(timezone.utc)
        alert = SearchAlert(
            user_id=user_id,
            query=query,
            module=module,
            city=city,
            filters_json=filters_json,
            email_alerts_enabled=email_alerts_enabled,
            created_at=now,
            updated_at=now,
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def update_search_alert(
        self,
        user_id: str,
        alert_id: int,
        query: str | None = None,
        module: str | None = None,
        city: str | None = None,
        filters_json: str | None = None,
        email_alerts_enabled: bool | None = None,
    ) -> SearchAlert | None:
        result = await self.db.execute(
            select(SearchAlert).where(SearchAlert.id == alert_id, SearchAlert.user_id == user_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            return None

        if query is not None:
            alert.query = query
        if module is not None:
            alert.module = module
        if city is not None:
            alert.city = city
        if filters_json is not None:
            alert.filters_json = filters_json
        if email_alerts_enabled is not None:
            alert.email_alerts_enabled = email_alerts_enabled

        alert.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def delete_search_alert(self, user_id: str, alert_id: int) -> bool:
        result = await self.db.execute(
            select(SearchAlert).where(SearchAlert.id == alert_id, SearchAlert.user_id == user_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            return False

        await self.db.delete(alert)
        await self.db.commit()
        return True
