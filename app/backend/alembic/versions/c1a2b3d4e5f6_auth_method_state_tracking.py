"""auth method state tracking

Revision ID: c1a2b3d4e5f6
Revises: b3f9c7d2e1a1
Create Date: 2026-03-25 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "b3f9c7d2e1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("oidc_states"):
        op.create_table(
            "oidc_states",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("state", sa.String(length=255), nullable=False),
            sa.Column("nonce", sa.String(length=255), nullable=False),
            sa.Column("code_verifier", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.Column("auth_method", sa.String(length=50), nullable=True),
            sa.Column("auth_mode", sa.String(length=50), nullable=True),
            sa.UniqueConstraint("state", name="uq_oidc_states_state"),
        )
        op.create_index(op.f("ix_oidc_states_id"), "oidc_states", ["id"], unique=False)
        op.create_index(op.f("ix_oidc_states_state"), "oidc_states", ["state"], unique=True)
        return

    existing_columns = {column["name"] for column in inspector.get_columns("oidc_states")}
    with op.batch_alter_table("oidc_states") as batch_op:
        if "auth_method" not in existing_columns:
            batch_op.add_column(sa.Column("auth_method", sa.String(length=50), nullable=True))
        if "auth_mode" not in existing_columns:
            batch_op.add_column(sa.Column("auth_mode", sa.String(length=50), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("oidc_states"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("oidc_states")}
    with op.batch_alter_table("oidc_states") as batch_op:
        if "auth_mode" in existing_columns:
            batch_op.drop_column("auth_mode")
        if "auth_method" in existing_columns:
            batch_op.drop_column("auth_method")
