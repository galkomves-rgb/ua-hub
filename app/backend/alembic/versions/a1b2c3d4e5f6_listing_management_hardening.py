"""listing management hardening

Revision ID: a1b2c3d4e5f6
Revises: f6a1c2d3e4b5
Create Date: 2026-03-26 00:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f6a1c2d3e4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("listings") as batch_op:
        batch_op.add_column(sa.Column("moderation_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("listings") as batch_op:
        batch_op.drop_column("moderation_reason")
