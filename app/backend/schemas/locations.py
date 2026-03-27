from pydantic import BaseModel, Field


class CitySuggestionResponse(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    region: str | None = Field(None, max_length=255)
    country: str | None = Field(None, max_length=255)
    country_code: str | None = Field(None, max_length=8)
    postal_code: str | None = Field(None, max_length=32)
    display_name: str = Field(..., min_length=1, max_length=500)
    latitude: float | None = None
    longitude: float | None = None