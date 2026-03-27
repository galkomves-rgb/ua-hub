"""moderation audit log

Revision ID: e7f8a9b0c1d2
Revises: c9d8e7f6a5b4
Create Date: 2026-03-27 10:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "moderation_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_moderation_audit_logs_id"), "moderation_audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_moderation_audit_logs_listing_id"), "moderation_audit_logs", ["listing_id"], unique=False)
    op.create_index(op.f("ix_moderation_audit_logs_actor_user_id"), "moderation_audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_moderation_audit_logs_action"), "moderation_audit_logs", ["action"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_moderation_audit_logs_action"), table_name="moderation_audit_logs")
    op.drop_index(op.f("ix_moderation_audit_logs_actor_user_id"), table_name="moderation_audit_logs")
    op.drop_index(op.f("ix_moderation_audit_logs_listing_id"), table_name="moderation_audit_logs")
    op.drop_index(op.f("ix_moderation_audit_logs_id"), table_name="moderation_audit_logs")
    op.drop_table("moderation_audit_logs")