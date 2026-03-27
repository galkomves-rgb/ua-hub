from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func


class Listings(Base):
    __tablename__ = "listings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    module = Column(String, nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    city = Column(String, nullable=False)
    region = Column(String, nullable=True)
    owner_type = Column(String, nullable=False)  # private_user, business_profile, organization
    owner_id = Column(String, nullable=False)
    pricing_tier = Column(String, nullable=False, default="free")  # free, basic, business
    visibility = Column(String, nullable=False, default="standard")  # standard, boosted, featured
    ranking_score = Column(Integer, nullable=False, default=0)
    badges = Column(String, nullable=True)  # JSON array
    images_json = Column(String, nullable=True)  # JSON array of image URLs
    event_date = Column(String, nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active", nullable=False)  # active, expired, draft
    is_featured = Column(Boolean, default=False)
    is_promoted = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    moderation_reason = Column(Text, nullable=True)
    meta_json = Column(String, nullable=True)  # JSON object with module-specific metadata
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    @property
    def expires_at(self):
        return self.expiry_date

    @property
    def owner_user_id(self):
        return self.user_id


class ModerationAuditLog(Base):
    __tablename__ = "moderation_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
