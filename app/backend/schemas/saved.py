from datetime import datetime

from pydantic import BaseModel, Field


class SavedListingResponse(BaseModel):
    id: int
    user_id: str
    listing_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SavedListingCardResponse(BaseModel):
    listing_id: int
    title: str
    city: str
    price: str | None = None
    module: str
    saved_at: datetime
    status: str | None = None
    primary_image: str | None = None


class SavedBusinessResponse(BaseModel):
    id: int
    user_id: str
    business_profile_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SavedBusinessCardResponse(BaseModel):
    business_id: int
    business_name: str
    category: str
    city: str
    is_verified: bool
    is_premium: bool
    saved_at: datetime
    logo_url: str | None = None


class SearchAlertCreate(BaseModel):
    query: str = Field(..., min_length=1, max_length=255)
    module: str | None = Field(None, max_length=50)
    city: str | None = Field(None, max_length=100)
    filters_json: str = Field("{}", max_length=5000)
    email_alerts_enabled: bool = True


class SearchAlertUpdate(BaseModel):
    query: str | None = Field(None, min_length=1, max_length=255)
    module: str | None = Field(None, max_length=50)
    city: str | None = Field(None, max_length=100)
    filters_json: str | None = Field(None, max_length=5000)
    email_alerts_enabled: bool | None = None


class SearchAlertResponse(BaseModel):
    id: int
    user_id: str
    query: str
    module: str | None = None
    city: str | None = None
    filters_json: str | None = None
    email_alerts_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
