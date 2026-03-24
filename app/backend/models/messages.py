from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Messages(Base):
    __tablename__ = "messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    recipient_id = Column(String, nullable=False)
    listing_id = Column(String, nullable=True)
    listing_title = Column(String, nullable=True)
    content = Column(String, nullable=False)
    is_read = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)