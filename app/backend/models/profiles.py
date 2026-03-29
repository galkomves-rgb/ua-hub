from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    city = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    preferred_language = Column(String, default="ua", nullable=False)
    account_type = Column(String, default="private", nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    is_public_profile = Column(Boolean, default=False, nullable=False)
    show_as_public_author = Column(Boolean, default=False, nullable=False)
    allow_marketing_emails = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def is_verified(self) -> bool:
        return False


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    owner_user_id = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    category = Column(String, nullable=False)
    city = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    contacts_json = Column(String, nullable=True)  # JSON: {phone, email, website}
    is_verified = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    tags_json = Column(String, nullable=True)  # JSON array of strings
    rating = Column(String, nullable=True)  # e.g., "4.8"
    website = Column(String, nullable=True)
    social_links_json = Column(String, nullable=True)
    service_areas_json = Column(String, nullable=True)
    verification_status = Column(String, nullable=False, default="unverified")
    verification_requested_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    subscription_plan = Column(String, nullable=True)
    subscription_request_status = Column(String, nullable=True)
    subscription_requested_plan = Column(String, nullable=True)
    subscription_requested_at = Column(DateTime(timezone=True), nullable=True)
    subscription_renewal_date = Column(DateTime(timezone=True), nullable=True)
    listing_quota = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BusinessProfileEvent(Base):
    __tablename__ = "business_profile_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    actor_user_id = Column(String, nullable=True, index=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
