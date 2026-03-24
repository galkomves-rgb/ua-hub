from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Advertisements(Base):
    __tablename__ = "advertisements"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=False)
    link_url = Column(String, nullable=False)
    position = Column(String, nullable=False)
    target_module = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False)
    priority = Column(Integer, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)