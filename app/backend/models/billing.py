from core.database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.sql import func


class BillingPayment(Base):
    __tablename__ = "billing_payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="SET NULL"), nullable=True, index=True)
    provider = Column(String, nullable=False, default="stripe")
    product_code = Column(String, nullable=False, index=True)
    product_type = Column(String, nullable=False, index=True)
    target_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending", index=True)
    entitlement_status = Column(String, nullable=True, index=True)
    amount_total = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, nullable=False, default="eur")
    checkout_mode = Column(String, nullable=False, default="payment")
    stripe_session_id = Column(String, nullable=True, unique=True, index=True)
    stripe_payment_intent_id = Column(String, nullable=True, index=True)
    stripe_invoice_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True, index=True)
    receipt_url = Column(String, nullable=True)
    invoice_url = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class BillingSubscription(Base):
    __tablename__ = "billing_subscriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_code = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="active", index=True)
    provider = Column(String, nullable=False, default="stripe")
    billing_cycle = Column(String, nullable=False, default="monthly")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    next_renewal_at = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    last_payment_id = Column(Integer, ForeignKey("billing_payments.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class BillingEntitlement(Base):
    __tablename__ = "billing_entitlements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("billing_payments.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("billing_subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=True, index=True)
    entitlement_type = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="active", index=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class BillingAuditLog(Base):
    __tablename__ = "billing_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    payment_id = Column(Integer, ForeignKey("billing_payments.id", ondelete="CASCADE"), nullable=True, index=True)
    subscription_id = Column(Integer, ForeignKey("billing_subscriptions.id", ondelete="CASCADE"), nullable=True, index=True)
    entitlement_id = Column(Integer, ForeignKey("billing_entitlements.id", ondelete="CASCADE"), nullable=True, index=True)
    actor_user_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)