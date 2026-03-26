from datetime import datetime
from pydantic import BaseModel, Field


# ============ UserProfile Schemas ============

class UserProfileBase(BaseModel):
    """Base schema for user profile."""

    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field("", max_length=100)
    bio: str = Field("", max_length=500)
    preferred_language: str = Field("ua", pattern="^(ua|es|en)$")
    account_type: str = Field("private", pattern="^(private|business)$")
    avatar_url: str | None = Field(None, max_length=1024)
    is_public_profile: bool = Field(False)
    show_as_public_author: bool = Field(False)
    allow_marketing_emails: bool = Field(False)


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""

    pass


class UserProfileUpdate(BaseModel):
    """Schema for updating a user profile."""

    name: str | None = Field(None, min_length=1, max_length=255)
    city: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=500)
    preferred_language: str | None = Field(None, pattern="^(ua|es|en)$")
    avatar_url: str | None = Field(None, max_length=1024)
    is_public_profile: bool | None = None
    show_as_public_author: bool | None = None
    allow_marketing_emails: bool | None = None


class UserProfileResponse(UserProfileBase):
    """Schema for user profile response."""

    user_id: str
    onboarding_completed: bool = False
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ BusinessProfile Schemas ============


class BusinessProfileBase(BaseModel):
    """Base schema for business profile."""

    slug: str = Field(..., min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    city: str = Field("", max_length=100)
    description: str = Field("", max_length=2000)
    logo_url: str | None = Field(None, max_length=1024)
    cover_url: str | None = Field(None, max_length=1024)
    contacts_json: str = Field("{}", max_length=1000)
    tags_json: str = Field("[]", max_length=500)
    rating: str = Field("0")
    website: str | None = Field(None, max_length=1024)
    social_links_json: str = Field("[]", max_length=2000)
    service_areas_json: str = Field("[]", max_length=2000)


class BusinessProfileCreate(BusinessProfileBase):
    """Schema for creating a business profile."""

    pass


class BusinessProfileUpdate(BaseModel):
    """Schema for updating a business profile."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, min_length=1, max_length=100)
    city: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=2000)
    logo_url: str | None = Field(None, max_length=1024)
    cover_url: str | None = Field(None, max_length=1024)
    contacts_json: str | None = Field(None, max_length=1000)
    tags_json: str | None = Field(None, max_length=500)
    rating: str | None = None
    website: str | None = Field(None, max_length=1024)
    social_links_json: str | None = Field(None, max_length=2000)
    service_areas_json: str | None = Field(None, max_length=2000)


class BusinessProfileResponse(BusinessProfileBase):
    """Schema for business profile response."""

    owner_user_id: str
    is_verified: bool = False
    is_premium: bool = False
    verification_status: str = "unverified"
    verification_requested_at: datetime | None = None
    verification_notes: str | None = None
    subscription_plan: str | None = None
    subscription_request_status: str | None = None
    subscription_requested_plan: str | None = None
    subscription_requested_at: datetime | None = None
    subscription_renewal_date: datetime | None = None
    listing_quota: int | None = None
    active_listings_count: int = 0
    total_views_count: int = 0
    saved_by_users_count: int = 0
    profile_completeness: int = 0
    public_preview_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BusinessProfileListResponse(BaseModel):
    """Schema for paginated business profiles list."""

    total: int
    limit: int
    offset: int
    items: list[BusinessProfileResponse]


class OnboardingStatusResponse(BaseModel):
    completed: bool
    has_user_profile: bool
    has_business_profile: bool
    account_type: str | None = None
    next_step: str


class OnboardingCompleteRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field("", max_length=100)
    bio: str = Field("", max_length=500)
    preferred_language: str = Field("ua", pattern="^(ua|es|en)$")
    avatar_url: str | None = Field(None, max_length=1024)
    account_type: str = Field(..., pattern="^(private|business)$")
    is_public_profile: bool = Field(False)
    show_as_public_author: bool = Field(False)
    allow_marketing_emails: bool = Field(False)


class BusinessVerificationRequest(BaseModel):
    message: str | None = Field(None, max_length=1000)


class BusinessSubscriptionRequest(BaseModel):
    plan: str = Field(..., pattern="^(basic|premium|business)$")
