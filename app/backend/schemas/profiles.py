from datetime import datetime
from pydantic import BaseModel, Field


# ============ UserProfile Schemas ============

class UserProfileBase(BaseModel):
    """Base schema for user profile."""

    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field("", max_length=100)
    bio: str = Field("", max_length=500)
    preferred_language: str = Field("ua", pattern="^(ua|es|en)$")
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
    subscription_plan: str | None = None
    listing_quota: int | None = None
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
