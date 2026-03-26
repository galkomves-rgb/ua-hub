"""auth session hardening

Revision ID: e4b7c9a2f1d3
Revises: d2f4e6a8b0c1
Create Date: 2026-03-26 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "e4b7c9a2f1d3"
down_revision: Union[str, Sequence[str], None] = "d2f4e6a8b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=False, server_default="user"),
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("tokens_valid_after", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    else:
        existing_user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "token_version" not in existing_user_columns:
            op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
            op.alter_column("users", "token_version", server_default=None)
        if "tokens_valid_after" not in existing_user_columns:
            op.add_column("users", sa.Column("tokens_valid_after", sa.DateTime(timezone=True), nullable=True))

    inspector = inspect(bind)
    if not inspector.has_table("auth_sessions"):
        op.create_table(
            "auth_sessions",
            sa.Column("session_id", sa.String(length=255), nullable=False),
            sa.Column("user_id", sa.String(length=255), nullable=False),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column("ip_address", sa.String(length=128), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoke_reason", sa.String(length=100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("session_id"),
        )

    auth_session_indexes = {index["name"] for index in inspector.get_indexes("auth_sessions")} if inspector.has_table("auth_sessions") else set()
    if op.f("ix_auth_sessions_session_id") not in auth_session_indexes:
        op.create_index(op.f("ix_auth_sessions_session_id"), "auth_sessions", ["session_id"], unique=False)
    if op.f("ix_auth_sessions_user_id") not in auth_session_indexes:
        op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("auth_sessions"):
        auth_session_indexes = {index["name"] for index in inspector.get_indexes("auth_sessions")}
        if op.f("ix_auth_sessions_user_id") in auth_session_indexes:
            op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
        if op.f("ix_auth_sessions_session_id") in auth_session_indexes:
            op.drop_index(op.f("ix_auth_sessions_session_id"), table_name="auth_sessions")
        op.drop_table("auth_sessions")

    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "tokens_valid_after" in user_columns:
            op.drop_column("users", "tokens_valid_after")
        if "token_version" in user_columns:
            op.drop_column("users", "token_version")
