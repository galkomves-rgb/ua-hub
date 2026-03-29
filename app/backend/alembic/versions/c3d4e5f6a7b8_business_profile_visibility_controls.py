"""business profile visibility controls

Revision ID: c3d4e5f6a7b8
Revises: b8c9d0e1f2a3
Create Date: 2026-03-29 18:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "business_profiles",
        sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "business_profiles",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "business_profiles",
        sa.Column("suspension_reason", sa.Text(), nullable=True),
    )
    op.alter_column("business_profiles", "is_suspended", server_default=None)


def downgrade() -> None:
    op.drop_column("business_profiles", "suspension_reason")
    op.drop_column("business_profiles", "suspended_at")
    op.drop_column("business_profiles", "is_suspended")
