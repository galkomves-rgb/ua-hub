from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from schemas.profiles import (
    BusinessProfileCreate,
    BusinessProfileListResponse,
    BusinessProfileResponse,
    BusinessSubscriptionRequest,
    BusinessProfileUpdate,
    BusinessVerificationRequest,
    OnboardingCompleteRequest,
    OnboardingStatusResponse,
    UserProfileCreate,
    UserProfileResponse,
    UserProfileUpdate,
)
from services.profiles_service import ProfileService

router = APIRouter(prefix="/api/v1/profiles", tags=["profiles"])


# ============ User Profile Endpoints ============


@router.post("/user", response_model=UserProfileResponse)
async def create_user_profile(
    profile_data: UserProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Create or get user profile for authenticated user."""
    service = ProfileService(db)

    # Check if profile exists
    existing = await service.get_user_profile(user_id)
    if existing:
        raise HTTPException(status_code=400, detail="User profile already exists")

    profile = await service.create_user_profile(
        user_id=user_id,
        name=profile_data.name,
        city=profile_data.city,
        bio=profile_data.bio,
        preferred_language=profile_data.preferred_language,
        account_type=profile_data.account_type,
        avatar_url=profile_data.avatar_url,
        onboarding_completed=profile_data.onboarding_completed if hasattr(profile_data, "onboarding_completed") else False,
        is_public_profile=profile_data.is_public_profile,
        show_as_public_author=profile_data.show_as_public_author,
        allow_marketing_emails=profile_data.allow_marketing_emails,
    )
    return profile


@router.get("/user", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Get user profile for authenticated user."""
    service = ProfileService(db)
    profile = await service.get_user_profile(user_id)

    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    return profile


@router.put("/user", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Update user profile for authenticated user."""
    service = ProfileService(db)
    profile = await service.update_user_profile(
        user_id=user_id,
        name=profile_data.name,
        city=profile_data.city,
        bio=profile_data.bio,
        preferred_language=profile_data.preferred_language,
        account_type=profile_data.account_type,
        avatar_url=profile_data.avatar_url,
        onboarding_completed=profile_data.onboarding_completed,
        is_public_profile=profile_data.is_public_profile,
        show_as_public_author=profile_data.show_as_public_author,
        allow_marketing_emails=profile_data.allow_marketing_emails,
    )

    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    return profile


@router.delete("/user")
async def delete_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete user profile for authenticated user."""
    service = ProfileService(db)
    deleted = await service.delete_user_profile(user_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="User profile not found")

    return {"message": "User profile deleted successfully"}


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = ProfileService(db)
    return await service.get_onboarding_status(user_id)


@router.post("/onboarding/complete", response_model=UserProfileResponse)
async def complete_onboarding(
    payload: OnboardingCompleteRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = ProfileService(db)
    existing = await service.get_user_profile(user_id)
    if existing:
        profile = await service.update_user_profile(
            user_id=user_id,
            name=payload.name,
            city=payload.city,
            bio=payload.bio,
            preferred_language=payload.preferred_language,
            account_type=payload.account_type,
            avatar_url=payload.avatar_url,
            onboarding_completed=True,
            is_public_profile=payload.is_public_profile,
            show_as_public_author=payload.show_as_public_author,
            allow_marketing_emails=payload.allow_marketing_emails,
        )
    else:
        profile = await service.create_user_profile(
            user_id=user_id,
            name=payload.name,
            city=payload.city,
            bio=payload.bio,
            preferred_language=payload.preferred_language,
            account_type=payload.account_type,
            avatar_url=payload.avatar_url,
            onboarding_completed=True,
            is_public_profile=payload.is_public_profile,
            show_as_public_author=payload.show_as_public_author,
            allow_marketing_emails=payload.allow_marketing_emails,
        )
    return profile


# ============ Business Profile Endpoints ============


@router.post("/business", response_model=BusinessProfileResponse)
async def create_business_profile(
    profile_data: BusinessProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new business profile for authenticated user."""
    service = ProfileService(db)

    # Check if slug already exists
    existing = await service.get_business_profile(profile_data.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Business slug already exists")

    profile = await service.create_business_profile(
        owner_user_id=user_id,
        slug=profile_data.slug,
        name=profile_data.name,
        category=profile_data.category,
        city=profile_data.city,
        description=profile_data.description,
        logo_url=profile_data.logo_url,
        cover_url=profile_data.cover_url,
        contacts_json=profile_data.contacts_json,
        tags_json=profile_data.tags_json,
        rating=profile_data.rating,
        website=profile_data.website,
        social_links_json=profile_data.social_links_json,
        service_areas_json=profile_data.service_areas_json,
    )
    return await service.serialize_business_profile(profile)


@router.get("/business/{slug}", response_model=BusinessProfileResponse)
async def get_business_profile(
    slug: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get business profile by slug."""
    service = ProfileService(db)
    profile = await service.get_business_profile(slug)

    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    return await service.serialize_business_profile(profile)


@router.get("/business", response_model=BusinessProfileListResponse)
async def list_business_profiles(
    category: str | None = Query(None),
    city: str | None = Query(None),
    is_verified: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """Search business profiles with optional filters."""
    service = ProfileService(db)
    profiles = await service.search_business_profiles(
        category=category,
        city=city,
        is_verified=is_verified,
        limit=limit,
        offset=offset,
    )

    items = await service.serialize_business_profiles(profiles)

    return BusinessProfileListResponse(
        total=len(items), limit=limit, offset=offset, items=items
    )


@router.get("/business/user/my", response_model=list[BusinessProfileResponse])
async def get_my_business_profiles(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all business profiles owned by authenticated user."""
    service = ProfileService(db)
    profiles = await service.get_business_profiles_by_owner(user_id)
    return await service.serialize_business_profiles(profiles)


@router.put("/business/{slug}", response_model=BusinessProfileResponse)
async def update_business_profile(
    slug: str,
    profile_data: BusinessProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Update business profile (owner only)."""
    service = ProfileService(db)
    profile = await service.get_business_profile(slug)

    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    # Check ownership
    if profile.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    updated_profile = await service.update_business_profile(
        slug=slug,
        name=profile_data.name,
        description=profile_data.description,
        category=profile_data.category,
        city=profile_data.city,
        logo_url=profile_data.logo_url,
        cover_url=profile_data.cover_url,
        contacts_json=profile_data.contacts_json,
        tags_json=profile_data.tags_json,
        rating=profile_data.rating,
        website=profile_data.website,
        social_links_json=profile_data.social_links_json,
        service_areas_json=profile_data.service_areas_json,
    )

    return await service.serialize_business_profile(updated_profile)


@router.post("/business/{slug}/verify-request", response_model=BusinessProfileResponse)
async def request_business_verification(
    slug: str,
    payload: BusinessVerificationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Submit a business verification request for review."""
    service = ProfileService(db)
    try:
        profile = await service.request_business_verification(slug, user_id, message=payload.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    return await service.serialize_business_profile(profile)


@router.post("/business/{slug}/subscription-request", response_model=BusinessProfileResponse)
async def request_business_subscription_change(
    slug: str,
    payload: BusinessSubscriptionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Submit a business subscription change request."""
    service = ProfileService(db)
    try:
        profile = await service.request_business_subscription_change(slug, user_id, requested_plan=payload.plan)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    return await service.serialize_business_profile(profile)


@router.delete("/business/{slug}")
async def delete_business_profile(
    slug: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete business profile (owner only)."""
    service = ProfileService(db)
    profile = await service.get_business_profile(slug)

    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")

    # Check ownership
    if profile.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this profile")

    deleted = await service.delete_business_profile(slug)

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete business profile")

    return {"message": "Business profile deleted successfully"}
