from datetime import datetime

from pydantic import BaseModel, Field

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
    pending_business_verifications_count: int
    pending_business_subscription_requests_count: int


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


class AdminOverviewBusinessItemResponse(BaseModel):
    slug: str
    name: str
    owner_user_id: str
    city: str
    verification_status: str
    verification_requested_at: datetime | None = None
    subscription_plan: str | None = None
    subscription_request_status: str | None = None
    subscription_requested_plan: str | None = None
    subscription_requested_at: datetime | None = None
    updated_at: datetime


class AdminOverviewResponse(BaseModel):
    counts: AdminOverviewCountsResponse
    recent_pending_listings: list[AdminOverviewListingItemResponse]
    recent_reports: list[AdminOverviewReportItemResponse]
    recent_payment_issues: list[AdminOverviewPaymentItemResponse]
    recent_business_requests: list[AdminOverviewBusinessItemResponse]


class AdminBusinessProfileItemResponse(BaseModel):
    slug: str
    name: str
    owner_user_id: str
    category: str
    city: str
    verification_status: str
    verification_requested_at: datetime | None = None
    verification_notes: str | None = None
    is_suspended: bool = False
    suspended_at: datetime | None = None
    suspension_reason: str | None = None
    subscription_plan: str | None = None
    subscription_request_status: str | None = None
    subscription_requested_plan: str | None = None
    subscription_requested_at: datetime | None = None
    is_verified: bool
    is_premium: bool
    created_at: datetime
    updated_at: datetime


class AdminBusinessProfilesPageResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminBusinessProfileItemResponse]


class AdminBusinessVerificationReviewRequest(BaseModel):
    decision: str
    moderation_note: str | None = None


class AdminBusinessSubscriptionReviewRequest(BaseModel):
    decision: str
    plan: str | None = Field(None, pattern="^(business_presence|business_priority|agency_starter|agency_growth|agency_pro)$")
    moderation_note: str | None = None
    manual_override: bool = False


class AdminBusinessVisibilityRequest(BaseModel):
    action: str = Field(..., pattern="^(suspend|restore|delete)$")
    moderation_note: str | None = None


class AdminBusinessVisibilityResponse(BaseModel):
    slug: str
    deleted: bool
    is_suspended: bool
    suspended_at: datetime | None = None
    suspension_reason: str | None = None


class AdminBusinessRelatedPaymentItemResponse(BaseModel):
    id: int
    title: str
    product_code: str
    status: str
    entitlement_status: str | None = None
    amount_total: float
    currency: str
    created_at: datetime
    paid_at: datetime | None = None
    period_end: datetime | None = None
    receipt_url: str | None = None
    invoice_url: str | None = None
    failure_reason: str | None = None


class AdminBusinessProfileDetailResponse(AdminBusinessProfileItemResponse):
    owner_email: str | None = None
    description: str
    logo_url: str | None = None
    cover_url: str | None = None
    contacts_json: str | None = None
    tags_json: str | None = None
    website: str | None = None
    social_links_json: str | None = None
    service_areas_json: str | None = None
    public_preview_url: str | None = None
    related_payments: list[AdminBusinessRelatedPaymentItemResponse] = []


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


class AdminListingVisibilityRequest(BaseModel):
    action: str = Field(..., pattern="^(archive|restore|delete)$")
    moderation_note: str | None = None


class AdminListingVisibilityResponse(BaseModel):
    id: int
    deleted: bool
    status: str | None = None


class AdminListingPromotionRequest(BaseModel):
    mode: str = Field(..., pattern="^(standard|boosted|featured)$")
    moderation_note: str | None = None


class AdminListingPromotionResponse(BaseModel):
    id: int
    visibility: str
    is_featured: bool
    is_promoted: bool
    ranking_score: int


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
