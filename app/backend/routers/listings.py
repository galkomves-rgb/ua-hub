from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from schemas.listings import (
    ListingCreate,
    ListingDetailResponse,
    ListingListResponse,
    ListingResponse,
    ListingUpdate,
)
from services.listings_service import ListingsService

router = APIRouter(prefix="/api/v1/listings", tags=["listings"])


@router.post("", response_model=ListingResponse)
async def create_listing(
    listing_data: ListingCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new listing for authenticated user."""
    service = ListingsService(db)
    listing = await service.create_listing(
        user_id=user_id,
        module=listing_data.module,
        category=listing_data.category,
        subcategory=listing_data.subcategory,
        title=listing_data.title,
        description=listing_data.description,
        price=listing_data.price,
        currency=listing_data.currency,
        city=listing_data.city,
        region=listing_data.region,
        owner_type=listing_data.owner_type,
        owner_id=listing_data.owner_id,
        images_json=listing_data.images_json,
        status=listing_data.status,
        is_featured=listing_data.is_featured,
        is_promoted=listing_data.is_promoted,
        is_verified=listing_data.is_verified,
        meta_json=listing_data.meta_json,
    )
    return listing


@router.get("", response_model=ListingListResponse)
async def list_listings(
    module: str | None = Query(None),
    category: str | None = Query(None),
    city: str | None = Query(None),
    owner_type: str | None = Query(None),
    status: str = Query("active"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """List listings with optional filters."""
    service = ListingsService(db)
    listings = await service.list_listings(
        module=module,
        category=category,
        city=city,
        owner_type=owner_type,
        status=status,
        limit=limit,
        offset=offset,
    )

    return ListingListResponse(
        total=len(listings), limit=limit, offset=offset, items=listings
    )


@router.get("/search/my", response_model=list[ListingResponse])
async def get_my_listings(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all listings created by authenticated user."""
    service = ListingsService(db)
    listings = await service.list_user_listings(
        user_id=user_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return listings


@router.get("/search/text", response_model=ListingListResponse)
async def search_listings(
    q: str = Query(..., min_length=2),
    module: str | None = Query(None),
    city: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """Search listings by title or description."""
    service = ListingsService(db)
    listings = await service.search_listings(
        query_text=q,
        module=module,
        city=city,
        limit=limit,
        offset=offset,
    )

    return ListingListResponse(
        total=len(listings), limit=limit, offset=offset, items=listings
    )


@router.get("/module/{module_id}", response_model=ListingListResponse)
async def get_module_listings(
    module_id: str,
    category: str | None = Query(None),
    city: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """Get listings for a specific module."""
    service = ListingsService(db)
    listings = await service.list_listings(
        module=module_id,
        category=category,
        city=city,
        status="active",
        limit=limit,
        offset=offset,
    )

    return ListingListResponse(
        total=len(listings), limit=limit, offset=offset, items=listings
    )


@router.get("/featured/all", response_model=list[ListingResponse])
async def get_featured_listings(
    module: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db_session),
):
    """Get featured listings."""
    service = ListingsService(db)
    listings = await service.get_featured_listings(module=module, limit=limit)
    return listings


@router.get("/business/{business_slug}", response_model=list[ListingResponse])
async def get_business_listings(
    business_slug: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """Get listings for a specific business profile."""
    service = ListingsService(db)
    listings = await service.get_business_listings(
        business_slug=business_slug,
        limit=limit,
        offset=offset,
    )
    return listings


@router.get("/{listing_id}", response_model=ListingDetailResponse)
async def get_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db_session),
):
    """Get listing by ID. Records a view."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    await service.record_view(listing_id)
    return listing


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: int,
    listing_data: ListingUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Update listing (owner only)."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this listing")

    updated_listing = await service.update_listing(
        listing_id=listing_id,
        title=listing_data.title,
        description=listing_data.description,
        price=listing_data.price,
        city=listing_data.city,
        status=listing_data.status,
        is_featured=listing_data.is_featured,
        is_promoted=listing_data.is_promoted,
        is_verified=listing_data.is_verified,
        images_json=listing_data.images_json,
    )

    return updated_listing


@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete listing (owner only)."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")

    deleted = await service.delete_listing(listing_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete listing")

    return {"message": "Listing deleted successfully"}
