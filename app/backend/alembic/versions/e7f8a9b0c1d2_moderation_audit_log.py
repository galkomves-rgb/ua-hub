"""moderation audit log

Revision ID: e7f8a9b0c1d2
Revises: c9d8e7f6a5b4
Create Date: 2026-03-27 10:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "moderation_audit_logs"


def upgrade() -> None:
    bind = op.get_context().bind
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    if TABLE_NAME not in existing_tables:
        op.create_table(
            TABLE_NAME,
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

    existing_indexes = (
        {idx["name"] for idx in inspector.get_indexes(TABLE_NAME)}
        if TABLE_NAME in existing_tables
        else set()
    )

    if "ix_moderation_audit_logs_id" not in existing_indexes:
        op.create_index(op.f("ix_moderation_audit_logs_id"), TABLE_NAME, ["id"], unique=False)
    if "ix_moderation_audit_logs_listing_id" not in existing_indexes:
        op.create_index(op.f("ix_moderation_audit_logs_listing_id"), TABLE_NAME, ["listing_id"], unique=False)
    if "ix_moderation_audit_logs_actor_user_id" not in existing_indexes:
        op.create_index(op.f("ix_moderation_audit_logs_actor_user_id"), TABLE_NAME, ["actor_user_id"], unique=False)
    if "ix_moderation_audit_logs_action" not in existing_indexes:
        op.create_index(op.f("ix_moderation_audit_logs_action"), TABLE_NAME, ["action"], unique=False)


def downgrade() -> None:
    bind = op.get_context().bind
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    if TABLE_NAME not in existing_tables:
        return

    existing_indexes = {idx["name"] for idx in inspector.get_indexes(TABLE_NAME)}

    if "ix_moderation_audit_logs_action" in existing_indexes:
        op.drop_index(op.f("ix_moderation_audit_logs_action"), table_name=TABLE_NAME)
    if "ix_moderation_audit_logs_actor_user_id" in existing_indexes:
        op.drop_index(op.f("ix_moderation_audit_logs_actor_user_id"), table_name=TABLE_NAME)
    if "ix_moderation_audit_logs_listing_id" in existing_indexes:
        op.drop_index(op.f("ix_moderation_audit_logs_listing_id"), table_name=TABLE_NAME)
    if "ix_moderation_audit_logs_id" in existing_indexes:
        op.drop_index(op.f("ix_moderation_audit_logs_id"), table_name=TABLE_NAME)

    op.drop_table(TABLE_NAME)
