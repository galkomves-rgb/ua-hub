from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text


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
    badges = Column(String, nullable=True)  # JSON array
    images_json = Column(String, nullable=True)  # JSON array of image URLs
    event_date = Column(String, nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active", nullable=False)  # active, expired, draft
    is_featured = Column(Boolean, default=False)
    is_promoted = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    meta_json = Column(String, nullable=True)  # JSON object with module-specific metadata
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    @property
    def expires_at(self):
        return self.expiry_date
