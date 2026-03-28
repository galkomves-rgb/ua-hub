"""add business google maps fields

Revision ID: c1d2e3f4a5b6
Revises: ab34cd56ef78
Create Date: 2026-03-28 13:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c1d2e3f4a5b6"
down_revision = "ab34cd56ef78"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("business_profiles", sa.Column("google_place_id", sa.String(), nullable=True))
    op.add_column("business_profiles", sa.Column("google_maps_rating", sa.String(), nullable=True))
    op.add_column("business_profiles", sa.Column("google_maps_review_count", sa.Integer(), nullable=True))
    op.add_column("business_profiles", sa.Column("google_maps_rating_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("business_profiles", "google_maps_rating_updated_at")
    op.drop_column("business_profiles", "google_maps_review_count")
    op.drop_column("business_profiles", "google_maps_rating")
    op.drop_column("business_profiles", "google_place_id")
