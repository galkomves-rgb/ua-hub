"""billing core

Revision ID: c9d8e7f6a5b4
Revises: a1b2c3d4e5f6
Create Date: 2026-03-26 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("business_profile_id", sa.Integer(), nullable=True),
        sa.Column("listing_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("product_code", sa.String(), nullable=False),
        sa.Column("product_type", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("entitlement_status", sa.String(), nullable=True),
        sa.Column("amount_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(), nullable=False),
        sa.Column("checkout_mode", sa.String(), nullable=False),
        sa.Column("stripe_session_id", sa.String(), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(), nullable=True),
        sa.Column("stripe_invoice_id", sa.String(), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("receipt_url", sa.String(), nullable=True),
        sa.Column("invoice_url", sa.String(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["business_profile_id"], ["business_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_session_id"),
    )
    op.create_index(op.f("ix_billing_payments_id"), "billing_payments", ["id"], unique=False)
    op.create_index(op.f("ix_billing_payments_user_id"), "billing_payments", ["user_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_business_profile_id"), "billing_payments", ["business_profile_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_listing_id"), "billing_payments", ["listing_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_product_code"), "billing_payments", ["product_code"], unique=False)
    op.create_index(op.f("ix_billing_payments_product_type"), "billing_payments", ["product_type"], unique=False)
    op.create_index(op.f("ix_billing_payments_status"), "billing_payments", ["status"], unique=False)
    op.create_index(op.f("ix_billing_payments_entitlement_status"), "billing_payments", ["entitlement_status"], unique=False)
    op.create_index(op.f("ix_billing_payments_stripe_session_id"), "billing_payments", ["stripe_session_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_stripe_payment_intent_id"), "billing_payments", ["stripe_payment_intent_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_stripe_invoice_id"), "billing_payments", ["stripe_invoice_id"], unique=False)
    op.create_index(op.f("ix_billing_payments_stripe_subscription_id"), "billing_payments", ["stripe_subscription_id"], unique=False)

    op.create_table(
        "billing_subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("business_profile_id", sa.Integer(), nullable=False),
        sa.Column("plan_code", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("billing_cycle", sa.String(), nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_renewal_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("last_payment_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["business_profile_id"], ["business_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_payment_id"], ["billing_payments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_subscriptions_id"), "billing_subscriptions", ["id"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_user_id"), "billing_subscriptions", ["user_id"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_business_profile_id"), "billing_subscriptions", ["business_profile_id"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_plan_code"), "billing_subscriptions", ["plan_code"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_status"), "billing_subscriptions", ["status"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_last_payment_id"), "billing_subscriptions", ["last_payment_id"], unique=False)

    op.create_table(
        "billing_entitlements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("business_profile_id", sa.Integer(), nullable=True),
        sa.Column("listing_id", sa.Integer(), nullable=True),
        sa.Column("entitlement_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["billing_payments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["billing_subscriptions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["business_profile_id"], ["business_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_entitlements_id"), "billing_entitlements", ["id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_user_id"), "billing_entitlements", ["user_id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_payment_id"), "billing_entitlements", ["payment_id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_subscription_id"), "billing_entitlements", ["subscription_id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_business_profile_id"), "billing_entitlements", ["business_profile_id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_listing_id"), "billing_entitlements", ["listing_id"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_entitlement_type"), "billing_entitlements", ["entitlement_type"], unique=False)
    op.create_index(op.f("ix_billing_entitlements_status"), "billing_entitlements", ["status"], unique=False)

    op.create_table(
        "billing_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("entitlement_id", sa.Integer(), nullable=True),
        sa.Column("actor_user_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["billing_payments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["billing_subscriptions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["entitlement_id"], ["billing_entitlements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_audit_logs_id"), "billing_audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_billing_audit_logs_payment_id"), "billing_audit_logs", ["payment_id"], unique=False)
    op.create_index(op.f("ix_billing_audit_logs_subscription_id"), "billing_audit_logs", ["subscription_id"], unique=False)
    op.create_index(op.f("ix_billing_audit_logs_entitlement_id"), "billing_audit_logs", ["entitlement_id"], unique=False)
    op.create_index(op.f("ix_billing_audit_logs_actor_user_id"), "billing_audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_billing_audit_logs_action"), "billing_audit_logs", ["action"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_billing_audit_logs_action"), table_name="billing_audit_logs")
    op.drop_index(op.f("ix_billing_audit_logs_actor_user_id"), table_name="billing_audit_logs")
    op.drop_index(op.f("ix_billing_audit_logs_entitlement_id"), table_name="billing_audit_logs")
    op.drop_index(op.f("ix_billing_audit_logs_subscription_id"), table_name="billing_audit_logs")
    op.drop_index(op.f("ix_billing_audit_logs_payment_id"), table_name="billing_audit_logs")
    op.drop_index(op.f("ix_billing_audit_logs_id"), table_name="billing_audit_logs")
    op.drop_table("billing_audit_logs")

    op.drop_index(op.f("ix_billing_entitlements_status"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_entitlement_type"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_listing_id"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_business_profile_id"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_subscription_id"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_payment_id"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_user_id"), table_name="billing_entitlements")
    op.drop_index(op.f("ix_billing_entitlements_id"), table_name="billing_entitlements")
    op.drop_table("billing_entitlements")

    op.drop_index(op.f("ix_billing_subscriptions_last_payment_id"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_status"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_plan_code"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_business_profile_id"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_user_id"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_id"), table_name="billing_subscriptions")
    op.drop_table("billing_subscriptions")

    op.drop_index(op.f("ix_billing_payments_stripe_subscription_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_stripe_invoice_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_stripe_payment_intent_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_stripe_session_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_entitlement_status"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_status"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_product_type"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_product_code"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_listing_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_business_profile_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_user_id"), table_name="billing_payments")
    op.drop_index(op.f("ix_billing_payments_id"), table_name="billing_payments")
    op.drop_table("billing_payments")
