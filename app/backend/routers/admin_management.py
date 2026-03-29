from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_admin_user
from dependencies.database import get_db_session
from schemas.admin import (
    AdminBusinessProfileDetailResponse,
    AdminBusinessProfileItemResponse,
    AdminBusinessProfilesPageResponse,
    AdminBusinessSubscriptionReviewRequest,
    AdminBusinessVisibilityRequest,
    AdminBusinessVisibilityResponse,
    AdminBusinessVerificationReviewRequest,
    AdminBillingPaymentsPageResponse,
    AdminListingVisibilityRequest,
    AdminListingVisibilityResponse,
    AdminReportItemResponse,
    AdminReportReviewRequest,
    AdminReportsPageResponse,
    AdminUserItemResponse,
    AdminUserRoleUpdateRequest,
    AdminUsersPageResponse,
)
from schemas.auth import UserResponse
from services.admin_service import AdminService


router = APIRouter(prefix="/api/v1/admin", tags=["admin-management"])


@router.get("/reports", response_model=AdminReportsPageResponse)
async def get_admin_reports(
    status: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await AdminService(db).list_reports(status=status, query_text=q, limit=limit, offset=offset)


@router.post("/reports/{report_id}/review", response_model=AdminReportItemResponse)
async def review_admin_report(
    report_id: int,
    payload: AdminReportReviewRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).review_report(
            report_id=report_id,
            status=payload.status,
            moderation_note=payload.moderation_note,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Report not found")
    return item


@router.get("/users", response_model=AdminUsersPageResponse)
async def get_admin_users(
    role: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await AdminService(db).list_users(role=role, query_text=q, limit=limit, offset=offset)


@router.put("/users/{user_id}/role", response_model=AdminUserItemResponse)
async def update_admin_user_role(
    user_id: str,
    payload: AdminUserRoleUpdateRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).update_user_role(
            user_id=user_id,
            role=payload.role,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    return item


@router.get("/billing/payments", response_model=AdminBillingPaymentsPageResponse)
async def get_admin_billing_payments(
    status: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await AdminService(db).list_billing_payments(status=status, query_text=q, limit=limit, offset=offset)


@router.get("/business/profiles", response_model=AdminBusinessProfilesPageResponse)
async def get_admin_business_profiles(
    verification_status: str | None = Query(None),
    subscription_request_status: str | None = Query(None),
    visibility_status: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await AdminService(db).list_business_profiles(
        verification_status=verification_status,
        subscription_request_status=subscription_request_status,
        visibility_status=visibility_status,
        query_text=q,
        limit=limit,
        offset=offset,
    )


@router.get("/business/{slug}", response_model=AdminBusinessProfileDetailResponse)
async def get_admin_business_profile_detail(
    slug: str,
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    item = await AdminService(db).get_business_profile_detail(slug)
    if not item:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return item


@router.post("/business/{slug}/verification-review", response_model=AdminBusinessProfileItemResponse)
async def review_admin_business_verification(
    slug: str,
    payload: AdminBusinessVerificationReviewRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).review_business_verification(
            slug=slug,
            decision=payload.decision,
            moderation_note=payload.moderation_note,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return item


@router.post("/business/{slug}/subscription-review", response_model=AdminBusinessProfileItemResponse)
async def review_admin_business_subscription(
    slug: str,
    payload: AdminBusinessSubscriptionReviewRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).review_business_subscription(
            slug=slug,
            decision=payload.decision,
            requested_plan=payload.plan,
            moderation_note=payload.moderation_note,
            manual_override=payload.manual_override,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return item


@router.post("/business/{slug}/visibility", response_model=AdminBusinessVisibilityResponse)
async def update_admin_business_visibility(
    slug: str,
    payload: AdminBusinessVisibilityRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).update_business_visibility(
            slug=slug,
            action=payload.action,
            moderation_note=payload.moderation_note,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return item


@router.post("/listings/{listing_id}/visibility", response_model=AdminListingVisibilityResponse)
async def update_admin_listing_visibility(
    listing_id: int,
    payload: AdminListingVisibilityRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        item = await AdminService(db).update_listing_visibility(
            listing_id=listing_id,
            action=payload.action,
            moderation_note=payload.moderation_note,
            admin_user_id=str(admin_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item
