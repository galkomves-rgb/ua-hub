"""admin business visibility controls

Revision ID: f1a2b3c4d5e6
Revises: ab34cd56ef78, b8c9d0e1f2a3, e7f8a9b0c1d2
Create Date: 2026-03-29 20:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = (
    "ab34cd56ef78",
    "b8c9d0e1f2a3",
    "e7f8a9b0c1d2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    columns = _column_names("business_profiles")

    if "is_suspended" not in columns:
        op.add_column(
            "business_profiles",
            sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
        op.alter_column("business_profiles", "is_suspended", server_default=None)

    if "suspended_at" not in columns:
        op.add_column(
            "business_profiles",
            sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "suspension_reason" not in columns:
        op.add_column(
            "business_profiles",
            sa.Column("suspension_reason", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    columns = _column_names("business_profiles")

    if "suspension_reason" in columns:
        op.drop_column("business_profiles", "suspension_reason")
    if "suspended_at" in columns:
        op.drop_column("business_profiles", "suspended_at")
    if "is_suspended" in columns:
        op.drop_column("business_profiles", "is_suspended")
