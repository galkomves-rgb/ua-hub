"""business profile analytics

Revision ID: a7b8c9d0e1f2
Revises: f6a1c2d3e4b5
Create Date: 2026-03-29 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a1c2d3e4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "business_profile_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("business_profile_id", sa.Integer(), sa.ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("actor_user_id", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_business_profile_events_business_profile_id", "business_profile_events", ["business_profile_id"])
    op.create_index("ix_business_profile_events_event_type", "business_profile_events", ["event_type"])
    op.create_index("ix_business_profile_events_actor_user_id", "business_profile_events", ["actor_user_id"])


def downgrade() -> None:
    op.drop_index("ix_business_profile_events_actor_user_id", table_name="business_profile_events")
    op.drop_index("ix_business_profile_events_event_type", table_name="business_profile_events")
    op.drop_index("ix_business_profile_events_business_profile_id", table_name="business_profile_events")
    op.drop_table("business_profile_events")
