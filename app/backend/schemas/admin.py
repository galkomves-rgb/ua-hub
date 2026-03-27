from datetime import datetime

from pydantic import BaseModel

from schemas.listings import ListingSummaryResponse


class AdminOverviewCountsResponse(BaseModel):
    moderation_pending_count: int
    rejected_listings_count: int
    published_listings_count: int
    total_listings_count: int
    total_users_count: int
    total_business_profiles_count: int
    open_reports_count: int
    pending_payments_count: int
    payment_issues_count: int
    active_subscriptions_count: int


class AdminOverviewListingItemResponse(BaseModel):
    id: int
    title: str
    module: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime


class AdminOverviewReportItemResponse(BaseModel):
    id: int
    reported_user_id: str
    listing_id: str | None = None
    reason: str
    status: str
    created_at: datetime


class AdminOverviewPaymentItemResponse(BaseModel):
    id: int
    title: str
    status: str
    amount_total: float
    currency: str
    created_at: datetime
    failure_reason: str | None = None


class AdminOverviewResponse(BaseModel):
    counts: AdminOverviewCountsResponse
    recent_pending_listings: list[AdminOverviewListingItemResponse]
    recent_reports: list[AdminOverviewReportItemResponse]
    recent_payment_issues: list[AdminOverviewPaymentItemResponse]


class AdminModerationAuditItemResponse(BaseModel):
    id: int
    listing_id: int
    actor_user_id: str | None = None
    action: str
    from_status: str | None = None
    to_status: str | None = None
    notes: str | None = None
    metadata: dict[str, str | list[str] | None]
    created_at: datetime


class AdminPagedListingsResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[ListingSummaryResponse]


class AdminReportItemResponse(BaseModel):
    id: int
    reporter_user_id: str
    reported_user_id: str
    listing_id: str | None = None
    reason: str
    details: str | None = None
    status: str
    moderation_note: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class AdminReportsPageResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminReportItemResponse]


class AdminReportReviewRequest(BaseModel):
    status: str
    moderation_note: str | None = None


class AdminBillingPaymentItemResponse(BaseModel):
    id: int
    user_id: str
    listing_id: int | None = None
    business_profile_id: int | None = None
    title: str
    product_code: str
    product_type: str
    target_type: str
    target_label: str | None = None
    status: str
    entitlement_status: str | None = None
    amount_total: float
    currency: str
    created_at: datetime
    paid_at: datetime | None = None
    period_end: datetime | None = None
    failure_reason: str | None = None


class AdminBillingPaymentsPageResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminBillingPaymentItemResponse]


class AdminUserItemResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    role: str
    profile_name: str | None = None
    city: str | None = None
    account_type: str | None = None
    is_public_profile: bool = False
    show_as_public_author: bool = False
    listings_count: int = 0
    business_profiles_count: int = 0
    created_at: datetime | None = None
    last_login: datetime | None = None


class AdminUsersPageResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminUserItemResponse]


class AdminUserRoleUpdateRequest(BaseModel):
    role: str