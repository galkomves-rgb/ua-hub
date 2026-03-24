from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from core.database import Base


class SavedListing(Base):
    __tablename__ = "saved_listings"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_saved_listings_user_listing"),)

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SavedBusiness(Base):
    __tablename__ = "saved_businesses"
    __table_args__ = (UniqueConstraint("user_id", "business_profile_id", name="uq_saved_businesses_user_business"),)

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SearchAlert(Base):
    __tablename__ = "search_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    query = Column(String, nullable=False)
    module = Column(String, nullable=True)
    city = Column(String, nullable=True)
    filters_json = Column(String, nullable=True)
    email_alerts_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
