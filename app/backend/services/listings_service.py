from datetime import datetime, timezone
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.listings import Listings


class ListingsService:
    """Service for managing listings operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

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
        price: str = None,
        currency: str = "EUR",
        subcategory: str = None,
        region: str = None,
        images_json: str = "[]",
        status: str = "active",
        is_featured: bool = False,
        is_promoted: bool = False,
        is_verified: bool = False,
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
            images_json=images_json,
            status=status,
            is_featured=is_featured,
            is_promoted=is_promoted,
            is_verified=is_verified,
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
        return result.scalar_one_or_none()

    async def list_listings(
        self,
        module: str = None,
        category: str = None,
        city: str = None,
        owner_type: str = None,
        status: str = "active",
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
            filters.append(Listings.status == status)

        if filters:
            query = query.where(and_(*filters))

        query = query.order_by(desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def list_user_listings(
        self,
        user_id: str,
        status: str = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Listings]:
        """List all listings created by a user."""
        query = select(Listings).where(Listings.user_id == user_id)

        if status:
            query = query.where(Listings.status == status)

        query = query.order_by(desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

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
                Listings.status == "active",
            )
        )

        if module:
            query = query.where(Listings.module == module)
        if city:
            query = query.where(Listings.city == city)

        query = query.order_by(desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_listing(
        self,
        listing_id: int,
        title: str = None,
        description: str = None,
        price: str = None,
        city: str = None,
        status: str = None,
        is_featured: bool = None,
        is_promoted: bool = None,
        is_verified: bool = None,
        images_json: str = None,
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
        if status is not None:
            listing.status = status
        if is_featured is not None:
            listing.is_featured = is_featured
        if is_promoted is not None:
            listing.is_promoted = is_promoted
        if is_verified is not None:
            listing.is_verified = is_verified
        if images_json is not None:
            listing.images_json = images_json

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
                Listings.status == "active",
            )
        )

        if module:
            query = query.where(Listings.module == module)

        query = query.order_by(desc(Listings.created_at)).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_business_listings(
        self, business_slug: str, limit: int = 50, offset: int = 0
    ) -> list[Listings]:
        """Get listings for a specific business profile."""
        query = select(Listings).where(
            and_(
                Listings.owner_id == business_slug,
                Listings.owner_type == "business_profile",
                Listings.status == "active",
            )
        )

        query = query.order_by(desc(Listings.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()
