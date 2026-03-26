"""user profile onboarding fields

Revision ID: d2f4e6a8b0c1
Revises: c1a2b3d4e5f6
Create Date: 2026-03-26 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2f4e6a8b0c1"
down_revision: Union[str, Sequence[str], None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.add_column(sa.Column("account_type", sa.String(length=50), server_default="private", nullable=False))
        batch_op.add_column(sa.Column("onboarding_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.drop_column("onboarding_completed")
        batch_op.drop_column("account_type")