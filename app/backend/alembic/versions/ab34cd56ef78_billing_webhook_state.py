"""billing webhook state

Revision ID: ab34cd56ef78
Revises: aa12bb34cc56
Create Date: 2026-03-28 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "ab34cd56ef78"
down_revision: Union[str, Sequence[str], None] = "aa12bb34cc56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("billing_subscriptions") as batch_op:
        batch_op.add_column(sa.Column("stripe_subscription_id", sa.String(), nullable=True))
        batch_op.create_index(batch_op.f("ix_billing_subscriptions_stripe_subscription_id"), ["stripe_subscription_id"], unique=True)

    op.create_table(
        "billing_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("object_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(op.f("ix_billing_webhook_events_id"), "billing_webhook_events", ["id"], unique=False)
    op.create_index(op.f("ix_billing_webhook_events_event_id"), "billing_webhook_events", ["event_id"], unique=False)
    op.create_index(op.f("ix_billing_webhook_events_event_type"), "billing_webhook_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_billing_webhook_events_object_id"), "billing_webhook_events", ["object_id"], unique=False)
    op.create_index(op.f("ix_billing_webhook_events_status"), "billing_webhook_events", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_billing_webhook_events_status"), table_name="billing_webhook_events")
    op.drop_index(op.f("ix_billing_webhook_events_object_id"), table_name="billing_webhook_events")
    op.drop_index(op.f("ix_billing_webhook_events_event_type"), table_name="billing_webhook_events")
    op.drop_index(op.f("ix_billing_webhook_events_event_id"), table_name="billing_webhook_events")
    op.drop_index(op.f("ix_billing_webhook_events_id"), table_name="billing_webhook_events")
    op.drop_table("billing_webhook_events")

    with op.batch_alter_table("billing_subscriptions") as batch_op:
        batch_op.drop_index(batch_op.f("ix_billing_subscriptions_stripe_subscription_id"))
        batch_op.drop_column("stripe_subscription_id")
