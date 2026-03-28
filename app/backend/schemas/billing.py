from datetime import datetime

from pydantic import BaseModel, Field


class BillingProductResponse(BaseModel):
    code: str
    title: str
    description: str
    category: str
    target_type: str
    amount: float
    currency: str
    duration_days: int | None = None
    listing_quota: int | None = None
    is_recurring: bool = False
    billing_mode: str = "payment"
    trial_days: int | None = None


class BillingSubscriptionSummaryResponse(BaseModel):
    business_profile_id: int
    slug: str
    business_name: str
    plan_code: str | None = None
    subscription_status: str | None = None
    payment_status: str | None = None
    renewal_date: datetime | None = None
    listing_quota: int | None = None
    active_listings_count: int = 0
    remaining_listing_quota: int | None = None
    is_premium: bool = False


class BillingBoostSummaryResponse(BaseModel):
    payment_id: int
    listing_id: int
    listing_title: str
    product_code: str
    entitlement_type: str
    status: str
    starts_at: datetime
    ends_at: datetime | None = None


class BillingUsageSummaryResponse(BaseModel):
    active_listings_count: int
    total_listing_quota: int
    remaining_listing_quota: int
    active_boosts_count: int


class BillingPaymentSummaryResponse(BaseModel):
    paid_payments_count: int
    pending_payments_count: int
    failed_payments_count: int
    total_spend: float
    currency: str


class BillingOverviewResponse(BaseModel):
    currency: str
    business_subscriptions: list[BillingSubscriptionSummaryResponse]
    active_boosts: list[BillingBoostSummaryResponse]
    usage: BillingUsageSummaryResponse
    payment_summary: BillingPaymentSummaryResponse
    available_products: list[BillingProductResponse]


class BillingHistoryItemResponse(BaseModel):
    id: int
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
    period_start: datetime | None = None
    period_end: datetime | None = None
    receipt_url: str | None = None
    invoice_url: str | None = None
    failure_reason: str | None = None


class BillingCheckoutRequest(BaseModel):
    product_code: str = Field(..., min_length=1, max_length=100)
    business_slug: str | None = Field(None, max_length=255)
    listing_id: int | None = None
    success_url: str | None = Field(None, max_length=2000)
    cancel_url: str | None = Field(None, max_length=2000)


class BillingCheckoutResponse(BaseModel):
    payment_id: int
    session_id: str
    checkout_url: str | None = None


class BillingVerifyRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=255)


class BillingVerifyResponse(BaseModel):
    payment: BillingHistoryItemResponse


class BillingAdminOverrideRequest(BaseModel):
    payment_status: str = Field(..., min_length=1, max_length=50)
    entitlement_status: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=2000)
