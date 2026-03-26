"""messaging hardening

Revision ID: d7e8f9a0b1c2
Revises: c9d8e7f6a5b4
Create Date: 2026-03-26 16:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "message_user_blocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("blocker_user_id", sa.String(), nullable=False),
        sa.Column("blocked_user_id", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_message_user_blocks_pair"),
    )
    op.create_index(op.f("ix_message_user_blocks_id"), "message_user_blocks", ["id"], unique=False)
    op.create_index(op.f("ix_message_user_blocks_blocker_user_id"), "message_user_blocks", ["blocker_user_id"], unique=False)
    op.create_index(op.f("ix_message_user_blocks_blocked_user_id"), "message_user_blocks", ["blocked_user_id"], unique=False)

    op.create_table(
        "message_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("reporter_user_id", sa.String(), nullable=False),
        sa.Column("reported_user_id", sa.String(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=True),
        sa.Column("listing_id", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("moderation_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_message_reports_id"), "message_reports", ["id"], unique=False)
    op.create_index(op.f("ix_message_reports_reporter_user_id"), "message_reports", ["reporter_user_id"], unique=False)
    op.create_index(op.f("ix_message_reports_reported_user_id"), "message_reports", ["reported_user_id"], unique=False)
    op.create_index(op.f("ix_message_reports_message_id"), "message_reports", ["message_id"], unique=False)
    op.create_index(op.f("ix_message_reports_listing_id"), "message_reports", ["listing_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_message_reports_listing_id"), table_name="message_reports")
    op.drop_index(op.f("ix_message_reports_message_id"), table_name="message_reports")
    op.drop_index(op.f("ix_message_reports_reported_user_id"), table_name="message_reports")
    op.drop_index(op.f("ix_message_reports_reporter_user_id"), table_name="message_reports")
    op.drop_index(op.f("ix_message_reports_id"), table_name="message_reports")
    op.drop_table("message_reports")

    op.drop_index(op.f("ix_message_user_blocks_blocked_user_id"), table_name="message_user_blocks")
    op.drop_index(op.f("ix_message_user_blocks_blocker_user_id"), table_name="message_user_blocks")
    op.drop_index(op.f("ix_message_user_blocks_id"), table_name="message_user_blocks")
    op.drop_table("message_user_blocks")