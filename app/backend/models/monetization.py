from core.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func


class ListingPromotion(Base):
    __tablename__ = "listing_promotions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("billing_payments.id", ondelete="SET NULL"), nullable=True, index=True)
    promotion_type = Column(String, nullable=False, index=True)  # boost, featured
    status = Column(String, nullable=False, default="active", index=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
