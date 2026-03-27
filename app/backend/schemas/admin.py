from datetime import datetime

from pydantic import BaseModel


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