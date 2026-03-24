from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
