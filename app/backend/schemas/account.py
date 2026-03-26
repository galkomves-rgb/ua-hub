from datetime import datetime

from pydantic import BaseModel


class AccountDashboardResponse(BaseModel):
    active_listings_count: int
    draft_listings_count: int
    saved_listings_count: int
    unread_messages_count: int
    business_profiles_count: int
    expiring_soon_count: int
    moderation_issues_count: int


class ListingManagementItem(BaseModel):
    id: int
    title: str
    module: str
    category: str
    owner_type: str | None = None
    pricing_tier: str | None = None
    visibility: str | None = None
    ranking_score: int = 0
    status: str
    created_at: datetime
    expires_at: datetime | None = None
    views_count: int
    unread_messages_count: int = 0
    is_featured: bool
    is_promoted: bool
    moderation_reason: str | None = None
    badges: str | None = None
    images_json: str | None = None

    class Config:
        from_attributes = True
