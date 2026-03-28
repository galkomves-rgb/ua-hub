from datetime import datetime, timezone
from core.config import settings
from models.listings import Listings
from models.profiles import UserProfile, BusinessProfile
from models.saved import SavedBusiness
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only


BUSINESS_PROFILE_BASE_ATTRS = (
    "id",
    "owner_user_id",
    "slug",
    "name",
    "logo_url",
    "cover_url",
    "category",
    "city",
    "description",
    "contacts_json",
    "is_verified",
    "is_premium",
    "tags_json",
    "rating",
    "website",
    "social_links_json",
    "service_areas_json",
    "verification_status",
    "verification_requested_at",
    "verification_notes",
    "subscription_plan",
    "subscription_request_status",
    "subscription_requested_plan",
    "subscription_requested_at",
    "subscription_renewal_date",
    "listing_quota",
    "created_at",
    "updated_at",
)

BUSINESS_PROFILE_GOOGLE_ATTRS = (
    "google_place_id",
    "google_maps_rating",
    "google_maps_review_count",
    "google_maps_rating_updated_at",
)


class ProfileService:
    """Service for managing user and business profile operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._business_google_columns_available: bool | None = None

    async def _has_business_google_columns(self) -> bool:
        if self._business_google_columns_available is not None:
            return self._business_google_columns_available

        try:
            bind = self.db.get_bind()
            dialect = bind.dialect.name if bind is not None else ""

            if dialect == "sqlite":
                result = await self.db.execute(text("PRAGMA table_info(business_profiles)"))
                column_names = {str(row[1]) for row in result.fetchall()}
            else:
                result = await self.db.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'business_profiles'
                          AND column_name IN (
                            'google_place_id',
                            'google_maps_rating',
                            'google_maps_review_count',
                            'google_maps_rating_updated_at'
                          )
                        """
                    )
                )
                column_names = {str(row[0]) for row in result.fetchall()}

            self._business_google_columns_available = all(
                attr in column_names for attr in BUSINESS_PROFILE_GOOGLE_ATTRS
            )
        except Exception:
            self._business_google_columns_available = False

        return self._business_google_columns_available

    async def _apply_business_profile_compat(self, query):
        if await self._has_business_google_columns():
            return query

        return query.options(
            load_only(*(getattr(BusinessProfile, attr) for attr in BUSINESS_PROFILE_BASE_ATTRS))
        )

    async def _refresh_business_profile(self, profile: BusinessProfile) -> None:
        attribute_names = list(BUSINESS_PROFILE_BASE_ATTRS)
        if await self._has_business_google_columns():
            attribute_names.extend(BUSINESS_PROFILE_GOOGLE_ATTRS)
        await self.db.refresh(profile, attribute_names=attribute_names)

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

    async def serialize_business_profile(self, profile: BusinessProfile) -> dict:
        has_google_columns = await self._has_business_google_columns()
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
            "profile_completeness": self._calculate_business_profile_completeness(profile),
            "public_preview_url": preview_url,
            "google_place_id": profile.google_place_id if has_google_columns else None,
            "google_maps_rating": profile.google_maps_rating if has_google_columns else None,
            "google_maps_review_count": profile.google_maps_review_count if has_google_columns else None,
            "google_maps_rating_updated_at": profile.google_maps_rating_updated_at if has_google_columns else None,
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
        await self._refresh_business_profile(profile)
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
        await self._refresh_business_profile(profile)
        return profile

    async def get_business_profile(self, slug: str) -> BusinessProfile | None:
        """Get business profile by slug."""
        query = await self._apply_business_profile_compat(
            select(BusinessProfile).where(BusinessProfile.slug == slug)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_business_profiles_by_owner(self, owner_user_id: str) -> list[BusinessProfile]:
        """Get all business profiles owned by a user."""
        query = await self._apply_business_profile_compat(
            select(BusinessProfile).where(BusinessProfile.owner_user_id == owner_user_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_onboarding_status(self, user_id: str) -> dict:
        profile = await self.get_user_profile(user_id)
        business_profiles = await self.get_business_profiles_by_owner(user_id)
        has_user_profile = profile is not None
        has_business_profile = len(business_profiles) > 0
        completed = bool(profile and profile.onboarding_completed)
        if not completed:
            next_step = "user_profile"
        elif profile and profile.account_type == "business" and not has_business_profile:
            next_step = "business_profile"
        else:
            next_step = "done"
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
        await self._refresh_business_profile(profile)
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
        await self._refresh_business_profile(profile)
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
        await self._refresh_business_profile(profile)
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

        query = (await self._apply_business_profile_compat(query)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()
