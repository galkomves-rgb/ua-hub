import re
import unicodedata
from datetime import datetime, timedelta, timezone
from core.config import settings
from models.listings import Listings
from models.profiles import UserProfile, BusinessProfile, BusinessProfileEvent
from models.saved import SavedBusiness
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession


CYRILLIC_SLUG_TRANSLATION = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "h",
        "ґ": "g",
        "д": "d",
        "е": "e",
        "є": "ye",
        "ж": "zh",
        "з": "z",
        "и": "y",
        "і": "i",
        "ї": "yi",
        "й": "i",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "kh",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "shch",
        "ь": "",
        "ю": "yu",
        "я": "ya",
        "ъ": "",
        "ы": "y",
        "э": "e",
        "ё": "yo",
    }
)


class ProfileService:
    """Service for managing user and business profile operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    BUSINESS_PROFILE_VIEW_EVENT = "profile_view"
    BUSINESS_PHONE_CLICK_EVENT = "phone_click"
    BUSINESS_EMAIL_CLICK_EVENT = "email_click"
    BUSINESS_WEBSITE_CLICK_EVENT = "website_click"
    BUSINESS_CONTACT_CLICK_EVENTS = (
        BUSINESS_PHONE_CLICK_EVENT,
        BUSINESS_EMAIL_CLICK_EVENT,
        BUSINESS_WEBSITE_CLICK_EVENT,
    )

    @staticmethod
    def _calculate_business_profile_completeness(profile: BusinessProfile) -> int:
        checks = [
            bool(profile.slug),
            bool(profile.name),
            bool(profile.category),
            bool(profile.city),
            bool(profile.description),
            bool(profile.logo_url),
            bool(profile.cover_url),
            bool(profile.website),
            bool(profile.contacts_json and profile.contacts_json not in {"", "{}"}),
            bool(profile.tags_json and profile.tags_json not in {"", "[]"}),
            bool(profile.service_areas_json and profile.service_areas_json not in {"", "[]"}),
            bool(profile.social_links_json and profile.social_links_json not in {"", "[]"}),
        ]
        completed = sum(1 for item in checks if item)
        return round(completed / len(checks) * 100)

    @staticmethod
    def _slugify_business_value(value: str) -> str:
        translated = value.lower().translate(CYRILLIC_SLUG_TRANSLATION)
        normalized = unicodedata.normalize("NFKD", translated)
        ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
        slug = re.sub(r"-{2,}", "-", slug)
        slug = slug[:100].strip("-")
        return slug or "business"

    async def generate_unique_business_slug(self, name: str) -> str:
        base_slug = self._slugify_business_value(name)
        candidate = base_slug
        suffix = 2

        while await self.get_business_profile(candidate):
            suffix_token = f"-{suffix}"
            trimmed_base = base_slug[: max(1, 100 - len(suffix_token))].rstrip("-") or "business"
            candidate = f"{trimmed_base}{suffix_token}"
            suffix += 1

        return candidate

    async def serialize_business_profile(self, profile: BusinessProfile) -> dict:
        active_statuses = ["active", "published"]
        active_listings_count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.owner_type == "business_profile",
                Listings.owner_id == profile.slug,
                Listings.status.in_(active_statuses),
            )
        )
        total_views_count = await self.db.scalar(
            select(func.coalesce(func.sum(Listings.views_count), 0)).where(
                Listings.owner_type == "business_profile",
                Listings.owner_id == profile.slug,
            )
        )
        saved_by_users_count = await self.db.scalar(
            select(func.count(SavedBusiness.id)).where(SavedBusiness.business_profile_id == profile.id)
        )
        now = datetime.now(timezone.utc)
        analytics = await self._get_business_profile_analytics(profile.id, now=now)
        frontend_base = (getattr(settings, "frontend_url", "") or "").rstrip("/")
        preview_url = f"{frontend_base}/business/{profile.slug}" if frontend_base else f"/business/{profile.slug}"

        return {
            "owner_user_id": profile.owner_user_id,
            "slug": profile.slug,
            "name": profile.name,
            "category": profile.category,
            "city": profile.city,
            "description": profile.description,
            "logo_url": profile.logo_url,
            "cover_url": profile.cover_url,
            "contacts_json": profile.contacts_json or "{}",
            "tags_json": profile.tags_json or "[]",
            "rating": profile.rating or "0",
            "website": profile.website,
            "social_links_json": profile.social_links_json or "[]",
            "service_areas_json": profile.service_areas_json or "[]",
            "is_verified": bool(profile.is_verified),
            "is_premium": bool(profile.is_premium),
            "verification_status": profile.verification_status,
            "verification_requested_at": profile.verification_requested_at,
            "verification_notes": profile.verification_notes,
            "subscription_plan": profile.subscription_plan,
            "subscription_request_status": profile.subscription_request_status,
            "subscription_requested_plan": profile.subscription_requested_plan,
            "subscription_requested_at": profile.subscription_requested_at,
            "subscription_renewal_date": profile.subscription_renewal_date,
            "listing_quota": profile.listing_quota,
            "active_listings_count": int(active_listings_count or 0),
            "total_views_count": int(total_views_count or 0),
            "saved_by_users_count": int(saved_by_users_count or 0),
            "profile_views_count": analytics["profile_views_count"],
            "profile_views_30d": analytics["profile_views_30d"],
            "contact_clicks_count": analytics["contact_clicks_count"],
            "contact_clicks_7d": analytics["contact_clicks_7d"],
            "contact_clicks_30d": analytics["contact_clicks_30d"],
            "phone_clicks_count": analytics["phone_clicks_count"],
            "email_clicks_count": analytics["email_clicks_count"],
            "website_clicks_count": analytics["website_clicks_count"],
            "profile_completeness": self._calculate_business_profile_completeness(profile),
            "public_preview_url": preview_url,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
        }

    async def serialize_business_profiles(self, profiles: list[BusinessProfile]) -> list[dict]:
        return [await self.serialize_business_profile(profile) for profile in profiles]

    # ============ UserProfile Operations ============

    async def create_user_profile(
        self,
        user_id: str,
        name: str,
        city: str = "",
        bio: str = "",
        preferred_language: str = "ua",
        account_type: str = "private",
        avatar_url: str = None,
        onboarding_completed: bool = False,
        is_public_profile: bool = False,
        show_as_public_author: bool = False,
        allow_marketing_emails: bool = False,
    ) -> UserProfile:
        """Create a new user profile."""
        now = datetime.now(timezone.utc)
        profile = UserProfile(
            user_id=user_id,
            name=name,
            avatar_url=avatar_url,
            city=city,
            bio=bio,
            preferred_language=preferred_language,
            account_type=account_type,
            created_at=now,
            updated_at=now,
            onboarding_completed=onboarding_completed,
            is_public_profile=is_public_profile,
            show_as_public_author=show_as_public_author,
            allow_marketing_emails=allow_marketing_emails,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_user_profile(self, user_id: str) -> UserProfile | None:
        """Get user profile by user_id."""
        result = await self.db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_user_profile(
        self,
        user_id: str,
        name: str = None,
        city: str = None,
        bio: str = None,
        preferred_language: str = None,
        account_type: str = None,
        avatar_url: str = None,
        onboarding_completed: bool = None,
        is_public_profile: bool = None,
        show_as_public_author: bool = None,
        allow_marketing_emails: bool = None,
    ) -> UserProfile | None:
        """Update user profile fields."""
        profile = await self.get_user_profile(user_id)
        if not profile:
            return None

        if name is not None:
            profile.name = name
        if city is not None:
            profile.city = city
        if bio is not None:
            profile.bio = bio
        if preferred_language is not None:
            profile.preferred_language = preferred_language
        if account_type is not None:
            profile.account_type = account_type
        if avatar_url is not None:
            profile.avatar_url = avatar_url
        if onboarding_completed is not None:
            profile.onboarding_completed = onboarding_completed
        if is_public_profile is not None:
            profile.is_public_profile = is_public_profile
        if show_as_public_author is not None:
            profile.show_as_public_author = show_as_public_author
        if allow_marketing_emails is not None:
            profile.allow_marketing_emails = allow_marketing_emails

        profile.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def delete_user_profile(self, user_id: str) -> bool:
        """Delete user profile."""
        profile = await self.get_user_profile(user_id)
        if not profile:
            return False

        await self.db.delete(profile)
        await self.db.commit()
        return True

    # ============ BusinessProfile Operations ============

    async def create_business_profile(
        self,
        owner_user_id: str,
        slug: str,
        name: str,
        category: str,
        city: str = "",
        description: str = "",
        logo_url: str = None,
        cover_url: str = None,
        contacts_json: str = "{}",
        tags_json: str = "[]",
        rating: str = "0",
        website: str = None,
        social_links_json: str = "[]",
        service_areas_json: str = "[]",
        verification_status: str = "unverified",
        subscription_plan: str = None,
        listing_quota: int = None,
    ) -> BusinessProfile:
        """Create a new business profile."""
        now = datetime.now(timezone.utc)
        profile = BusinessProfile(
            owner_user_id=owner_user_id,
            slug=slug,
            name=name,
            logo_url=logo_url,
            cover_url=cover_url,
            category=category,
            city=city,
            description=description,
            contacts_json=contacts_json,
            is_verified=False,
            is_premium=False,
            tags_json=tags_json,
            rating=rating,
            website=website,
            social_links_json=social_links_json,
            service_areas_json=service_areas_json,
            verification_status=verification_status,
            subscription_plan=subscription_plan,
            listing_quota=listing_quota,
            created_at=now,
            updated_at=now,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_business_profile(self, slug: str) -> BusinessProfile | None:
        """Get business profile by slug."""
        result = await self.db.execute(
            select(BusinessProfile).where(BusinessProfile.slug == slug)
        )
        return result.scalar_one_or_none()

    async def record_business_profile_event(
        self,
        slug: str,
        event_type: str,
        actor_user_id: str | None = None,
        metadata_json: str | None = None,
    ) -> BusinessProfile | None:
        profile = await self.get_business_profile(slug)
        if not profile:
            return None

        self.db.add(
            BusinessProfileEvent(
                business_profile_id=profile.id,
                event_type=event_type,
                actor_user_id=actor_user_id,
                metadata_json=metadata_json,
                created_at=datetime.now(timezone.utc),
            )
        )
        await self.db.commit()
        return profile

    async def get_business_profiles_by_owner(self, owner_user_id: str) -> list[BusinessProfile]:
        """Get all business profiles owned by a user."""
        result = await self.db.execute(
            select(BusinessProfile).where(BusinessProfile.owner_user_id == owner_user_id)
        )
        return result.scalars().all()

    async def get_onboarding_status(self, user_id: str) -> dict:
        profile = await self.get_user_profile(user_id)
        business_profiles = await self.get_business_profiles_by_owner(user_id)
        has_user_profile = profile is not None
        has_business_profile = len(business_profiles) > 0
        completed = bool(profile and profile.onboarding_completed)
        next_step = "done" if completed else "user_profile"
        return {
            "completed": completed,
            "has_user_profile": has_user_profile,
            "has_business_profile": has_business_profile,
            "account_type": profile.account_type if profile else None,
            "next_step": next_step,
        }

    async def update_business_profile(
        self,
        slug: str,
        name: str = None,
        description: str = None,
        category: str = None,
        city: str = None,
        logo_url: str = None,
        cover_url: str = None,
        contacts_json: str = None,
        tags_json: str = None,
        rating: str = None,
        website: str = None,
        social_links_json: str = None,
        service_areas_json: str = None,
    ) -> BusinessProfile | None:
        """Update business profile fields."""
        profile = await self.get_business_profile(slug)
        if not profile:
            return None

        if name is not None:
            profile.name = name
        if description is not None:
            profile.description = description
        if category is not None:
            profile.category = category
        if city is not None:
            profile.city = city
        if logo_url is not None:
            profile.logo_url = logo_url
        if cover_url is not None:
            profile.cover_url = cover_url
        if contacts_json is not None:
            profile.contacts_json = contacts_json
        if tags_json is not None:
            profile.tags_json = tags_json
        if rating is not None:
            profile.rating = rating
        if website is not None:
            profile.website = website
        if social_links_json is not None:
            profile.social_links_json = social_links_json
        if service_areas_json is not None:
            profile.service_areas_json = service_areas_json

        profile.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def request_business_verification(
        self,
        slug: str,
        owner_user_id: str,
        message: str | None = None,
    ) -> BusinessProfile | None:
        profile = await self.get_business_profile(slug)
        if not profile or profile.owner_user_id != owner_user_id:
            return None
        if profile.verification_status in {"pending", "verified"}:
            raise ValueError("Business verification request is already active")

        profile.verification_status = "pending"
        profile.is_verified = False
        profile.verification_requested_at = datetime.now(timezone.utc)
        profile.verification_notes = message
        profile.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def request_business_subscription_change(
        self,
        slug: str,
        owner_user_id: str,
        requested_plan: str,
    ) -> BusinessProfile | None:
        profile = await self.get_business_profile(slug)
        if not profile or profile.owner_user_id != owner_user_id:
            return None
        if profile.subscription_request_status == "pending" and profile.subscription_requested_plan == requested_plan:
            raise ValueError("A subscription change request for this plan is already pending")
        if profile.subscription_plan == requested_plan:
            raise ValueError("Business profile is already on this subscription plan")

        profile.subscription_request_status = "pending"
        profile.subscription_requested_plan = requested_plan
        profile.subscription_requested_at = datetime.now(timezone.utc)
        profile.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def delete_business_profile(self, slug: str) -> bool:
        """Delete business profile."""
        profile = await self.get_business_profile(slug)
        if not profile:
            return False

        await self.db.delete(profile)
        await self.db.commit()
        return True

    async def search_business_profiles(
        self,
        category: str = None,
        city: str = None,
        is_verified: bool = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[BusinessProfile]:
        """Search business profiles with optional filters."""
        query = select(BusinessProfile)

        if category:
            query = query.where(BusinessProfile.category == category)
        if city:
            query = query.where(BusinessProfile.city == city)
        if is_verified is not None:
            query = query.where(BusinessProfile.is_verified == is_verified)

        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def _get_business_profile_analytics(self, business_profile_id: int, now: datetime | None = None) -> dict[str, int]:
        anchor = now or datetime.now(timezone.utc)
        seven_days_ago = anchor - timedelta(days=7)
        thirty_days_ago = anchor - timedelta(days=30)

        result = await self.db.execute(
            select(
                func.count(BusinessProfileEvent.id),
                func.sum(case((BusinessProfileEvent.event_type == self.BUSINESS_PROFILE_VIEW_EVENT, 1), else_=0)),
                func.sum(
                    case(
                        (BusinessProfileEvent.event_type.in_(self.BUSINESS_CONTACT_CLICK_EVENTS), 1),
                        else_=0,
                    )
                ),
                func.sum(case((BusinessProfileEvent.event_type == self.BUSINESS_PHONE_CLICK_EVENT, 1), else_=0)),
                func.sum(case((BusinessProfileEvent.event_type == self.BUSINESS_EMAIL_CLICK_EVENT, 1), else_=0)),
                func.sum(case((BusinessProfileEvent.event_type == self.BUSINESS_WEBSITE_CLICK_EVENT, 1), else_=0)),
                func.sum(
                    case(
                        (
                            and_(
                                BusinessProfileEvent.event_type.in_(self.BUSINESS_CONTACT_CLICK_EVENTS),
                                BusinessProfileEvent.created_at >= seven_days_ago,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                func.sum(
                    case(
                        (
                            and_(
                                BusinessProfileEvent.event_type.in_(self.BUSINESS_CONTACT_CLICK_EVENTS),
                                BusinessProfileEvent.created_at >= thirty_days_ago,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                func.sum(
                    case(
                        (
                            and_(
                                BusinessProfileEvent.event_type == self.BUSINESS_PROFILE_VIEW_EVENT,
                                BusinessProfileEvent.created_at >= thirty_days_ago,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            ).where(BusinessProfileEvent.business_profile_id == business_profile_id)
        )
        row = result.one()
        return {
            "events_count": int(row[0] or 0),
            "profile_views_count": int(row[1] or 0),
            "contact_clicks_count": int(row[2] or 0),
            "phone_clicks_count": int(row[3] or 0),
            "email_clicks_count": int(row[4] or 0),
            "website_clicks_count": int(row[5] or 0),
            "contact_clicks_7d": int(row[6] or 0),
            "contact_clicks_30d": int(row[7] or 0),
            "profile_views_30d": int(row[8] or 0),
        }
