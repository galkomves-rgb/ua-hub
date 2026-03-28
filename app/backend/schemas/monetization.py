from datetime import datetime

from pydantic import BaseModel, Field

from schemas.listings import ListingResponse, ListingSummaryResponse


class ListingCreateWithPricingRequest(BaseModel):
    module: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=100)
    subcategory: str | None = Field(None, max_length=100)
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)
    price: str | None = Field(None, max_length=50)
    currency: str = Field("EUR", max_length=10)
    city: str = Field(..., max_length=100)
    region: str | None = Field(None, max_length=100)
    owner_type: str = Field(..., pattern="^(private_user|business_profile|organization)$")
    owner_id: str = Field(..., max_length=255)
    images_json: str = Field("[]", max_length=5000)
    meta_json: str = Field("{}", max_length=2000)
    pricing_tier: str | None = Field(None, pattern="^(free|basic|business)$")


class ListingCreateResultResponse(BaseModel):
    listing: ListingResponse
    payment_required: bool = False
    required_product_code: str | None = None
    message: str | None = None


class ListingExtendRequest(BaseModel):
    listing_id: int


class PromotionCheckoutResponse(BaseModel):
    payment_id: int
    session_id: str
    checkout_url: str | None = None
    listing_id: int
    promotion_type: str


class SubscriptionActivateRequest(BaseModel):
    plan: str = Field(..., pattern="^(starter|growth|pro|business_presence|business_priority|agency_starter|agency_growth|agency_pro)$")
    business_slug: str = Field(..., min_length=1, max_length=255)


class SubscriptionCurrentResponse(BaseModel):
    profile_type: str = Field(..., pattern="^(private|business)$")
    has_active_subscription: bool
    plan: str | None = None
    status: str | None = None
    expires_at: datetime | None = None
    listing_quota: int | None = None
    active_listings_count: int = 0
    remaining_listing_quota: int | None = None
    paywall_reason: str | None = None


class PaymentCreateRequest(BaseModel):
    type: str = Field(..., pattern="^(next_private_listing_30|listing_extend_30|boost|featured|business_presence|business_priority|agency_starter|agency_growth|agency_pro|listing_basic|promotion_boost|promotion_featured|business_starter|business_growth|business_pro)$")
    listing_id: int | None = None
    business_slug: str | None = Field(None, max_length=255)
    success_url: str | None = Field(None, max_length=2000)
    cancel_url: str | None = Field(None, max_length=2000)


class PaymentCreateResponse(BaseModel):
    payment_id: int
    session_id: str
    checkout_url: str | None = None
    type: str


class PaymentConfirmRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=255)


class PaymentConfirmResponse(BaseModel):
    payment: dict


class ExpirationRunResponse(BaseModel):
    as_of: datetime
    expired_listings: int
    expired_listing_ids: list[int] = Field(default_factory=list)
    expired_promotions: int
    expired_promotion_ids: list[int] = Field(default_factory=list)
    expired_subscriptions: int
    expired_subscription_ids: list[int] = Field(default_factory=list)
    affected_listing_ids: list[int] = Field(default_factory=list)
    affected_business_profile_ids: list[int] = Field(default_factory=list)


class MonetizedListingSummaryResponse(ListingSummaryResponse):
    pricing_tier: str | None = None
    visibility: str | None = None
    ranking_score: int = 0
