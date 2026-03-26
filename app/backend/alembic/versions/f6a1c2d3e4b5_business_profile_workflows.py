"""business profile workflows

Revision ID: f6a1c2d3e4b5
Revises: e4b7c9a2f1d3
Create Date: 2026-03-26 00:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6a1c2d3e4b5"
down_revision: Union[str, Sequence[str], None] = "e4b7c9a2f1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("business_profiles") as batch_op:
        batch_op.add_column(sa.Column("verification_requested_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("verification_notes", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("subscription_request_status", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("subscription_requested_plan", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("subscription_requested_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("subscription_renewal_date", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("business_profiles") as batch_op:
        batch_op.drop_column("subscription_renewal_date")
        batch_op.drop_column("subscription_requested_at")
        batch_op.drop_column("subscription_requested_plan")
        batch_op.drop_column("subscription_request_status")
        batch_op.drop_column("verification_notes")
        batch_op.drop_column("verification_requested_at")
