from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.profiles import UserProfile, BusinessProfile


class ProfileService:
    """Service for managing user and business profile operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============ UserProfile Operations ============

    async def create_user_profile(
        self,
        user_id: str,
        name: str,
        city: str = "",
        bio: str = "",
        preferred_language: str = "ua",
        avatar_url: str = None,
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
            created_at=now,
            updated_at=now,
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
        avatar_url: str = None,
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
        if avatar_url is not None:
            profile.avatar_url = avatar_url
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

    async def get_business_profiles_by_owner(self, owner_user_id: str) -> list[BusinessProfile]:
        """Get all business profiles owned by a user."""
        result = await self.db.execute(
            select(BusinessProfile).where(BusinessProfile.owner_user_id == owner_user_id)
        )
        return result.scalars().all()

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
