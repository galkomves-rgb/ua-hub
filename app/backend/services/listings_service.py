import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.listings import Listings
from models.messages import Messages
from models.profiles import BusinessProfile, UserProfile
from models.saved import SavedListing
from services.monetization import MonetizationService, PaymentRequiredError


LISTING_STATUS_DRAFT = "draft"
LISTING_STATUS_MODERATION_PENDING = "moderation_pending"
LISTING_STATUS_PUBLISHED = "published"
LISTING_STATUS_REJECTED = "rejected"
LISTING_STATUS_EXPIRED = "expired"
LISTING_STATUS_ARCHIVED = "archived"
LISTING_STATUS_ACTIVE = "active"
MODERATOR_BADGES_ALLOWED = {"featured", "urgent", "remote", "online", "free"}


class ListingsService:
    """Service for managing listings operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _parse_badges(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError):
            return []
        if not isinstance(parsed, list):
            return []
        return [str(item) for item in parsed if isinstance(item, str)]

    @staticmethod
    def _dump_badges(values: list[str]) -> str:
        return json.dumps(values, ensure_ascii=True)

    @staticmethod
    def _sanitize_moderator_badges(values: list[str] | None) -> str:
        normalized: list[str] = []
        for value in values or []:
            label = value.strip().lower()
            if label in MODERATOR_BADGES_ALLOWED and label not in normalized:
                normalized.append(label)
        return ListingsService._dump_badges(normalized)

    async def _attach_public_author_metadata(self, listings: list[Listings]) -> None:
        if not listings:
            return

        public_user_ids = {
            listing.user_id
            for listing in listings
            if listing.owner_type in {"private_user", "organization"}
        }
        business_slugs = {
            listing.owner_id
            for listing in listings
            if listing.owner_type == "business_profile" and listing.owner_id
        }

        public_profiles_by_user_id: dict[str, UserProfile] = {}
        if public_user_ids:
            user_profiles_result = await self.db.execute(
                select(UserProfile).where(UserProfile.user_id.in_(public_user_ids))
            )
            public_profiles_by_user_id = {
                profile.user_id: profile
                for profile in user_profiles_result.scalars().all()
                if profile.show_as_public_author and profile.is_public_profile
            }

        business_profiles_by_slug: dict[str, BusinessProfile] = {}
        if business_slugs:
            business_profiles_result = await self.db.execute(
                select(BusinessProfile).where(BusinessProfile.slug.in_(business_slugs))
            )
            business_profiles_by_slug = {
                profile.slug: profile for profile in business_profiles_result.scalars().all()
            }

        for listing in listings:
            author_name = None
            author_avatar_url = None

            if listing.owner_type == "business_profile":
                business_profile = business_profiles_by_slug.get(listing.owner_id)
                if business_profile:
                    author_name = business_profile.name
                    author_avatar_url = business_profile.logo_url
            else:
                public_profile = public_profiles_by_user_id.get(listing.user_id)
                if public_profile:
                    author_name = public_profile.name
                    author_avatar_url = public_profile.avatar_url

            listing.author_name = author_name
            listing.author_avatar_url = author_avatar_url

    async def create_listing(
        self,
        user_id: str,
        module: str,
        category: str,
        title: str,
        description: str,
        city: str,
        owner_type: str,
        owner_id: str,
        pricing_tier: str = "free",
        visibility: str = "standard",
        ranking_score: int = 0,
        expiry_date: datetime | None = None,
        price: str = None,
        currency: str = "EUR",
        subcategory: str = None,
        region: str = None,
        images_json: str = "[]",
        meta_json: str = "{}",
    ) -> Listings:
        """Create a new listing."""
        now = datetime.now(timezone.utc)
        listing = Listings(
            user_id=user_id,
            module=module,
            category=category,
            subcategory=subcategory,
            title=title,
            description=description,
            price=price,
            currency=currency,
            city=city,
            region=region,
            owner_type=owner_type,
            owner_id=owner_id,
            pricing_tier=pricing_tier,
            visibility=visibility,
            ranking_score=ranking_score,
            badges=self._dump_badges([]),
            images_json=images_json,
            expiry_date=expiry_date,
            status=LISTING_STATUS_DRAFT,
            is_featured=False,
            is_promoted=False,
            is_verified=False,
            moderation_reason=None,
            meta_json=meta_json,
            views_count=0,
            created_at=now,
            updated_at=now,
        )
        self.db.add(listing)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def get_listing(self, listing_id: int) -> Listings | None:
        """Get listing by ID."""
        result = await self.db.execute(
            select(Listings).where(Listings.id == listing_id)
        )
        listing = result.scalar_one_or_none()
        if listing:
            await self._attach_public_author_metadata([listing])
        return listing

    async def list_listings(
        self,
        module: str = None,
        category: str = None,
        city: str = None,
        owner_type: str = None,
        status: str = LISTING_STATUS_PUBLISHED,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Listings]:
        """List listings with optional filters."""
        query = select(Listings)

        filters = []
        if module:
            filters.append(Listings.module == module)
        if category:
            filters.append(Listings.category == category)
        if city:
            filters.append(Listings.city == city)
        if owner_type:
            filters.append(Listings.owner_type == owner_type)
        if status:
            if status == LISTING_STATUS_PUBLISHED:
                filters.append(Listings.status.in_([LISTING_STATUS_PUBLISHED, "active"]))
            else:
                filters.append(Listings.status == status)

        if filters:
            query = query.where(and_(*filters))

        query = query.order_by(desc(Listings.ranking_score), desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        listings = result.scalars().all()
        await self._attach_public_author_metadata(listings)
        return listings

    async def list_user_listings(
        self,
        user_id: str,
        status: str = None,
        module: str = None,
        query_text: str = None,
        sort: str = "newest",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """List all listings created by a user."""
        query = select(Listings).where(Listings.user_id == user_id)

        if status:
            query = query.where(Listings.status == status)

        if module:
            query = query.where(Listings.module == module)

        if query_text:
            search_term = f"%{query_text}%"
            query = query.where(
                or_(
                    Listings.title.ilike(search_term),
                    Listings.description.ilike(search_term),
                    Listings.category.ilike(search_term),
                )
            )

        if sort == "oldest":
            query = query.order_by(Listings.created_at.asc())
        elif sort == "views_desc":
            query = query.order_by(Listings.views_count.desc(), Listings.created_at.desc())
        elif sort == "expires_soon":
            query = query.order_by(Listings.expiry_date.asc().nulls_last(), Listings.created_at.desc())
        else:
            query = query.order_by(desc(Listings.created_at))

        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        listings = result.scalars().all()
        if not listings:
            return []

        listing_ids = [listing.id for listing in listings]
        listing_id_strings = [str(listing_id) for listing_id in listing_ids]

        unread_counts_result = await self.db.execute(
            select(Messages.listing_id, func.count(Messages.id))
            .where(
                Messages.listing_id.in_(listing_id_strings),
                Messages.recipient_id == user_id,
                Messages.is_read.is_(False),
            )
            .group_by(Messages.listing_id)
        )
        unread_counts = {int(listing_id): count for listing_id, count in unread_counts_result.all() if listing_id is not None}

        saved_counts_result = await self.db.execute(
            select(SavedListing.listing_id, func.count(SavedListing.id))
            .where(SavedListing.listing_id.in_(listing_ids))
            .group_by(SavedListing.listing_id)
        )
        saved_counts = {listing_id: count for listing_id, count in saved_counts_result.all()}

        items: list[dict] = []
        for listing in listings:
            items.append(
                {
                    "id": listing.id,
                    "title": listing.title,
                    "module": listing.module,
                    "category": listing.category,
                    "owner_type": listing.owner_type,
                    "pricing_tier": listing.pricing_tier,
                    "visibility": listing.visibility,
                    "ranking_score": int(listing.ranking_score or 0),
                    "status": listing.status,
                    "created_at": listing.created_at,
                    "expires_at": listing.expires_at,
                    "views_count": listing.views_count or 0,
                    "unread_messages_count": int(unread_counts.get(listing.id, 0)),
                    "saved_count": int(saved_counts.get(listing.id, 0)),
                    "is_featured": bool(listing.is_featured),
                    "is_promoted": bool(listing.is_promoted),
                    "is_verified": bool(listing.is_verified),
                    "moderation_reason": listing.moderation_reason,
                    "badges": listing.badges,
                    "images_json": listing.images_json,
                }
            )

        return items

    async def search_listings(
        self,
        query_text: str,
        module: str = None,
        city: str = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Listings]:
        """Search listings by title or description."""
        query = select(Listings).where(
            and_(
                or_(
                    Listings.title.ilike(f"%{query_text}%"),
                    Listings.description.ilike(f"%{query_text}%"),
                ),
                Listings.status.in_([LISTING_STATUS_PUBLISHED, "active"]),
            )
        )

        if module:
            query = query.where(Listings.module == module)
        if city:
            query = query.where(Listings.city == city)

        query = query.order_by(desc(Listings.ranking_score), desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        listings = result.scalars().all()
        await self._attach_public_author_metadata(listings)
        return listings

    async def update_listing(
        self,
        listing_id: int,
        title: str = None,
        description: str = None,
        price: str = None,
        city: str = None,
        category: str = None,
        subcategory: str = None,
        region: str = None,
        images_json: str = None,
        meta_json: str = None,
    ) -> Listings | None:
        """Update listing fields."""
        listing = await self.get_listing(listing_id)
        if not listing:
            return None

        if title is not None:
            listing.title = title
        if description is not None:
            listing.description = description
        if price is not None:
            listing.price = price
        if city is not None:
            listing.city = city
        if category is not None:
            listing.category = category
        if subcategory is not None:
            listing.subcategory = subcategory
        if region is not None:
            listing.region = region
        if images_json is not None:
            listing.images_json = images_json
        if meta_json is not None:
            listing.meta_json = meta_json

        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def delete_listing(self, listing_id: int) -> bool:
        """Delete listing."""
        listing = await self.get_listing(listing_id)
        if not listing:
            return False

        await self.db.delete(listing)
        await self.db.commit()
        return True

    async def record_view(self, listing_id: int) -> bool:
        """Record a view for listing."""
        listing = await self.get_listing(listing_id)
        if not listing:
            return False

        listing.views_count = (listing.views_count or 0) + 1
        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def get_featured_listings(
        self, module: str = None, limit: int = 10
    ) -> list[Listings]:
        """Get featured listings."""
        query = select(Listings).where(
            and_(
                Listings.is_featured == True,
                Listings.status.in_([LISTING_STATUS_PUBLISHED, "active"]),
            )
        )

        if module:
            query = query.where(Listings.module == module)

        query = query.order_by(desc(Listings.ranking_score), desc(Listings.created_at)).limit(limit)
        result = await self.db.execute(query)
        listings = result.scalars().all()
        await self._attach_public_author_metadata(listings)
        return listings

    async def get_business_listings(
        self, business_slug: str, limit: int = 50, offset: int = 0
    ) -> list[Listings]:
        """Get listings for a specific business profile."""
        query = select(Listings).where(
            and_(
                Listings.owner_id == business_slug,
                Listings.owner_type == "business_profile",
                Listings.status.in_([LISTING_STATUS_PUBLISHED, "active"]),
            )
        )

        query = query.order_by(desc(Listings.ranking_score), desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        listings = result.scalars().all()
        await self._attach_public_author_metadata(listings)
        return listings

    async def submit_listing(self, listing_id: int) -> Listings | None:
        """Submit a draft or rejected listing for moderation."""
        listing = await self.get_listing(listing_id)
        if not listing or listing.status not in {LISTING_STATUS_DRAFT, LISTING_STATUS_REJECTED}:
            return None

        monetization_service = MonetizationService(self.db)
        await monetization_service.assert_listing_submission_allowed(listing)

        listing.status = LISTING_STATUS_MODERATION_PENDING
        listing.moderation_reason = None
        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def archive_listing(self, listing_id: int) -> Listings | None:
        """Archive a listing owned by the current user."""
        listing = await self.get_listing(listing_id)
        if not listing or listing.status == LISTING_STATUS_ARCHIVED:
            return None

        listing.status = LISTING_STATUS_ARCHIVED
        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def renew_listing(self, listing_id: int) -> Listings | None:
        """Renew an expired or archived listing back to draft."""
        listing = await self.get_listing(listing_id)
        if not listing or listing.status not in {LISTING_STATUS_EXPIRED, LISTING_STATUS_ARCHIVED}:
            return None

        listing.status = LISTING_STATUS_DRAFT
        listing.moderation_reason = None
        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def boost_listing(self, listing_id: int) -> Listings | None:
        """Direct listing boosts are disabled; use paid billing checkout instead."""
        return None

    async def duplicate_listing(self, listing_id: int) -> Listings | None:
        """Create a draft copy of an existing listing."""
        source = await self.get_listing(listing_id)
        if not source:
            return None

        now = datetime.now(timezone.utc)
        duplicate = Listings(
            user_id=source.user_id,
            module=source.module,
            category=source.category,
            subcategory=source.subcategory,
            title=f"{source.title} (copy)",
            description=source.description,
            price=source.price,
            currency=source.currency,
            city=source.city,
            region=source.region,
            owner_type=source.owner_type,
            owner_id=source.owner_id,
            pricing_tier=source.pricing_tier,
            visibility=source.visibility,
            ranking_score=source.ranking_score,
            badges=source.badges,
            images_json=source.images_json,
            expiry_date=None,
            status=LISTING_STATUS_DRAFT,
            is_featured=source.is_featured,
            is_promoted=False,
            is_verified=source.is_verified,
            moderation_reason=None,
            meta_json=source.meta_json,
            views_count=0,
            created_at=now,
            updated_at=now,
        )
        self.db.add(duplicate)
        await self.db.commit()
        await self.db.refresh(duplicate)
        return duplicate

    async def list_moderation_queue(
        self,
        status: str = LISTING_STATUS_MODERATION_PENDING,
        module: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        query = select(Listings)

        if status == "all":
            query = query.where(Listings.status.in_([LISTING_STATUS_MODERATION_PENDING, LISTING_STATUS_REJECTED]))
        else:
            query = query.where(Listings.status == status)

        if module:
            query = query.where(Listings.module == module)

        query = query.order_by(desc(Listings.updated_at), desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        listings = result.scalars().all()

        items: list[dict] = []
        for listing in listings:
            items.append(
                {
                    "id": listing.id,
                    "title": listing.title,
                    "module": listing.module,
                    "category": listing.category,
                    "owner_type": listing.owner_type,
                    "pricing_tier": listing.pricing_tier,
                    "visibility": listing.visibility,
                    "ranking_score": int(listing.ranking_score or 0),
                    "status": listing.status,
                    "created_at": listing.created_at,
                    "expires_at": listing.expires_at,
                    "views_count": listing.views_count or 0,
                    "unread_messages_count": 0,
                    "saved_count": 0,
                    "is_featured": bool(listing.is_featured),
                    "is_promoted": bool(listing.is_promoted),
                    "is_verified": bool(listing.is_verified),
                    "moderation_reason": listing.moderation_reason,
                    "badges": listing.badges,
                    "images_json": listing.images_json,
                }
            )

        return items

    async def moderate_listing(
        self,
        listing_id: int,
        decision: str,
        moderation_reason: str | None = None,
        module: str | None = None,
        category: str | None = None,
        badges: list[str] | None = None,
    ) -> Listings | None:
        listing = await self.get_listing(listing_id)
        if not listing:
            return None

        if listing.status != LISTING_STATUS_MODERATION_PENDING:
            raise ValueError("Only listings in moderation can be moderated")

        if module and module.strip():
            listing.module = module.strip()

        if category and category.strip():
            listing.category = category.strip()

        if badges is not None:
            listing.badges = self._sanitize_moderator_badges(badges)

        if decision == "approve":
            listing.status = LISTING_STATUS_PUBLISHED
            listing.moderation_reason = None
        elif decision == "reject":
            if not moderation_reason or not moderation_reason.strip():
                raise ValueError("Moderation reason is required when rejecting a listing")
            listing.status = LISTING_STATUS_REJECTED
            listing.moderation_reason = moderation_reason.strip()
        else:
            raise ValueError("Unsupported moderation decision")

        listing.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing
