from datetime import datetime
from pydantic import BaseModel, Field


# ============ Listing Schemas ============


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
    status: str = Field("active", pattern="^(active|expired|draft)$")
    is_featured: bool = Field(False)
    is_promoted: bool = Field(False)
    is_verified: bool = Field(False)
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
    status: str | None = Field(None, pattern="^(active|expired|draft)$")
    is_featured: bool | None = None
    is_promoted: bool | None = None
    is_verified: bool | None = None
    images_json: str | None = Field(None, max_length=5000)


class ListingResponse(ListingBase):
    """Schema for listing response."""

    id: int
    user_id: str
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
