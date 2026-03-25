"""auth method state tracking

Revision ID: c1a2b3d4e5f6
Revises: b3f9c7d2e1a1
Create Date: 2026-03-25 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "b3f9c7d2e1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("oidc_states") as batch_op:
        batch_op.add_column(sa.Column("auth_method", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("auth_mode", sa.String(length=50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("oidc_states") as batch_op:
        batch_op.drop_column("auth_mode")
        batch_op.drop_column("auth_method")