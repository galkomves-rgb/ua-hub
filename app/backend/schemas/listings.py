from datetime import datetime
from pydantic import BaseModel, Field


# ============ Listing Schemas ============


LISTING_STATUS_PATTERN = "^(draft|moderation_pending|published|rejected|expired|archived|active)$"


class ListingBase(BaseModel):
    """Base schema for listing."""

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


class ListingCreate(ListingBase):
    """Schema for creating a listing."""

    pass


class ListingUpdate(BaseModel):
    """Schema for updating a listing."""

    title: str | None = Field(None, min_length=3, max_length=255)
    description: str | None = Field(None, min_length=10, max_length=5000)
    price: str | None = Field(None, max_length=50)
    city: str | None = Field(None, max_length=100)
    category: str | None = Field(None, min_length=1, max_length=100)
    subcategory: str | None = Field(None, max_length=100)
    region: str | None = Field(None, max_length=100)
    images_json: str | None = Field(None, max_length=5000)
    meta_json: str | None = Field(None, max_length=2000)


class ListingActionResponse(BaseModel):
    id: int
    status: str = Field(..., pattern=LISTING_STATUS_PATTERN)

    class Config:
        from_attributes = True


class ListingSummaryResponse(BaseModel):
    id: int
    title: str
    module: str
    category: str
    status: str = Field(..., pattern=LISTING_STATUS_PATTERN)
    created_at: datetime
    expires_at: datetime | None = None
    views_count: int
    is_featured: bool
    is_promoted: bool
    is_verified: bool

    class Config:
        from_attributes = True


class ListingResponse(ListingBase):
    """Schema for listing response."""

    id: int
    user_id: str
    status: str = Field(..., pattern=LISTING_STATUS_PATTERN)
    is_featured: bool
    is_promoted: bool
    is_verified: bool
    views_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    """Schema for paginated listings list."""

    total: int
    limit: int
    offset: int
    items: list[ListingResponse]


class ListingDetailResponse(ListingResponse):
    """Schema for detailed listing view."""

    pass
