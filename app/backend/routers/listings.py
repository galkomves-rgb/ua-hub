from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_admin_user, get_current_user_id
from dependencies.database import get_db_session
from schemas.auth import UserResponse
from schemas.admin import (
    AdminListingPromotionRequest,
    AdminListingPromotionResponse,
    AdminListingVisibilityRequest,
    AdminListingVisibilityResponse,
    AdminModerationAuditItemResponse,
    AdminPagedListingsResponse,
)
from schemas.listings import (
    ListingActionResponse,
    ListingCreate,
    ListingDetailResponse,
    ListingListResponse,
    ListingModerationRequest,
    ListingResponse,
    ListingSummaryResponse,
    ListingUpdate,
)
from services.listings_service import ListingsService
from services.monetization import PaymentRequiredError

router = APIRouter(prefix="/api/v1/listings", tags=["listings"])
admin_router = APIRouter(prefix="/api/v1/admin/listings", tags=["admin-listings"])


@router.post("", deprecated=True)
async def create_listing(
    listing_data: ListingCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Legacy create endpoint is disabled; use the canonical monetized create flow."""
    raise HTTPException(
        status_code=410,
        detail={
            "message": "Listing creation moved to /api/v1/listings/create",
            "canonical_endpoint": "/api/v1/listings/create",
            "paywall_flow": "create_paywall_submit",
        },
    )


@router.get("", response_model=ListingListResponse)
async def list_listings(
    module: str | None = Query(None),
    category: str | None = Query(None),
    city: str | None = Query(None),
    owner_type: str | None = Query(None),
    status: str = Query("published"),
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


@router.get("/search/my", response_model=list[ListingSummaryResponse])
async def get_my_listings(
    status: str | None = Query(None),
    module: str | None = Query(None),
    q: str | None = Query(None),
    sort: str = Query("newest", pattern="^(newest|oldest|views_desc|expires_soon)$"),
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
        module=module,
        query_text=q,
        sort=sort,
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
        status="published",
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
    record_view: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """Get listing by ID. Records a view."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if not await service.is_listing_publicly_visible(listing):
        raise HTTPException(status_code=404, detail="Listing not found")

    if record_view:
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
        category=listing_data.category,
        subcategory=listing_data.subcategory,
        region=listing_data.region,
        images_json=listing_data.images_json,
        meta_json=listing_data.meta_json,
    )

    return updated_listing


@router.post("/{listing_id}/submit", response_model=ListingActionResponse)
async def submit_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Submit a draft or rejected listing for moderation."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to submit this listing")

    try:
        updated_listing = await service.submit_listing(listing_id)
    except PaymentRequiredError as exc:
        raise HTTPException(
            status_code=402,
            detail={
                "message": str(exc),
                "required_product_code": exc.product_code,
                "paywall_reason": exc.paywall_reason,
                "listing_id": exc.listing_id or listing_id,
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated_listing:
        raise HTTPException(status_code=400, detail="Listing cannot be submitted in its current state")

    return updated_listing


@router.post("/{listing_id}/archive", response_model=ListingActionResponse)
async def archive_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Archive a listing."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to archive this listing")

    updated_listing = await service.archive_listing(listing_id)
    if not updated_listing:
        raise HTTPException(status_code=400, detail="Listing cannot be archived in its current state")

    return updated_listing


@router.post("/{listing_id}/renew", response_model=ListingActionResponse)
async def renew_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Renew an archived or expired listing back to draft."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to renew this listing")

    updated_listing = await service.renew_listing(listing_id)
    if not updated_listing:
        raise HTTPException(status_code=400, detail="Listing cannot be renewed in its current state")

    return updated_listing


@router.post("/{listing_id}/boost", response_model=ListingActionResponse)
async def boost_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Block direct boosts; listing promotion must go through billing checkout."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to boost this listing")
    raise HTTPException(
        status_code=402,
        detail="Listing promotion requires a paid billing checkout",
    )


@admin_router.get("/moderation-queue", response_model=AdminPagedListingsResponse)
async def get_moderation_queue(
    status: str = Query("moderation_pending", pattern="^(moderation_pending|rejected|all)$"),
    module: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    return await service.list_moderation_queue(status=status, module=module, query_text=q, limit=limit, offset=offset)


@admin_router.get("/catalog", response_model=AdminPagedListingsResponse)
async def get_admin_listings_catalog(
    status: str | None = Query(None),
    module: str | None = Query(None),
    owner_type: str | None = Query(None),
    q: str | None = Query(None),
    sort: str = Query("newest", pattern="^(newest|oldest|views_desc|expires_soon)$"),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    return await service.list_admin_listings(
        status=status,
        module=module,
        owner_type=owner_type,
        query_text=q,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@admin_router.get("/{listing_id}/audit", response_model=list[AdminModerationAuditItemResponse])
async def get_moderation_audit(
    listing_id: int,
    limit: int = Query(20, ge=1, le=100),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    return await service.list_moderation_audit(listing_id=listing_id, limit=limit)


@admin_router.post("/{listing_id}/moderate", response_model=ListingActionResponse)
async def moderate_listing(
    listing_id: int,
    payload: ListingModerationRequest,
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    try:
        listing = await service.moderate_listing(
            listing_id=listing_id,
            decision=payload.decision,
            moderation_reason=payload.moderation_reason,
            module=payload.module,
            category=payload.category,
            badges=payload.badges,
            actor_user_id=_admin_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    return listing


@admin_router.post("/{listing_id}/visibility", response_model=AdminListingVisibilityResponse)
async def update_admin_listing_visibility(
    listing_id: int,
    payload: AdminListingVisibilityRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    try:
        listing = await service.admin_update_listing_visibility(
            listing_id=listing_id,
            action=payload.action,
            moderation_note=payload.moderation_note,
            actor_user_id=admin_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@admin_router.post("/{listing_id}/promotion", response_model=AdminListingPromotionResponse)
async def update_admin_listing_promotion(
    listing_id: int,
    payload: AdminListingPromotionRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    try:
        listing = await service.admin_update_listing_promotion(
            listing_id=listing_id,
            mode=payload.mode,
            moderation_note=payload.moderation_note,
            actor_user_id=admin_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/{listing_id}/duplicate", response_model=ListingResponse)
async def duplicate_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Duplicate a listing into a new draft."""
    service = ListingsService(db)
    listing = await service.get_listing(listing_id)

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to duplicate this listing")

    duplicated_listing = await service.duplicate_listing(listing_id)
    if not duplicated_listing:
        raise HTTPException(status_code=400, detail="Listing cannot be duplicated")

    return duplicated_listing


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
