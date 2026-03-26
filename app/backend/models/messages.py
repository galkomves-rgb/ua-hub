from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func


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


class MessageUserBlock(Base):
    __tablename__ = "message_user_blocks"
    __table_args__ = (
        UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_message_user_blocks_pair"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    blocker_user_id = Column(String, nullable=False, index=True)
    blocked_user_id = Column(String, nullable=False, index=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class MessageReport(Base):
    __tablename__ = "message_reports"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    reporter_user_id = Column(String, nullable=False, index=True)
    reported_user_id = Column(String, nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    listing_id = Column(String, nullable=True, index=True)
    reason = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    moderation_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
