"""account foundation

Revision ID: b3f9c7d2e1a1
Revises: add_profiles_and_update_listings
Create Date: 2026-03-24 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3f9c7d2e1a1"
down_revision: Union[str, Sequence[str], None] = "add_profiles_and_update_listings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.add_column(sa.Column("is_public_profile", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        batch_op.add_column(sa.Column("show_as_public_author", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        batch_op.add_column(sa.Column("allow_marketing_emails", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    with op.batch_alter_table("business_profiles") as batch_op:
        batch_op.add_column(sa.Column("website", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("social_links_json", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("service_areas_json", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("verification_status", sa.String(), server_default="unverified", nullable=False))
        batch_op.add_column(sa.Column("subscription_plan", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("listing_quota", sa.Integer(), nullable=True))

    op.create_table(
        "saved_listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "listing_id", name="uq_saved_listings_user_listing"),
    )
    op.create_index(op.f("ix_saved_listings_id"), "saved_listings", ["id"], unique=False)
    op.create_index(op.f("ix_saved_listings_listing_id"), "saved_listings", ["listing_id"], unique=False)
    op.create_index(op.f("ix_saved_listings_user_id"), "saved_listings", ["user_id"], unique=False)

    op.create_table(
        "saved_businesses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("business_profile_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["business_profile_id"], ["business_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "business_profile_id", name="uq_saved_businesses_user_business"),
    )
    op.create_index(op.f("ix_saved_businesses_id"), "saved_businesses", ["id"], unique=False)
    op.create_index(op.f("ix_saved_businesses_business_profile_id"), "saved_businesses", ["business_profile_id"], unique=False)
    op.create_index(op.f("ix_saved_businesses_user_id"), "saved_businesses", ["user_id"], unique=False)

    op.create_table(
        "search_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("module", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("filters_json", sa.String(), nullable=True),
        sa.Column("email_alerts_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_search_alerts_id"), "search_alerts", ["id"], unique=False)
    op.create_index(op.f("ix_search_alerts_user_id"), "search_alerts", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_search_alerts_user_id"), table_name="search_alerts")
    op.drop_index(op.f("ix_search_alerts_id"), table_name="search_alerts")
    op.drop_table("search_alerts")

    op.drop_index(op.f("ix_saved_businesses_user_id"), table_name="saved_businesses")
    op.drop_index(op.f("ix_saved_businesses_business_profile_id"), table_name="saved_businesses")
    op.drop_index(op.f("ix_saved_businesses_id"), table_name="saved_businesses")
    op.drop_table("saved_businesses")

    op.drop_index(op.f("ix_saved_listings_user_id"), table_name="saved_listings")
    op.drop_index(op.f("ix_saved_listings_listing_id"), table_name="saved_listings")
    op.drop_index(op.f("ix_saved_listings_id"), table_name="saved_listings")
    op.drop_table("saved_listings")

    with op.batch_alter_table("business_profiles") as batch_op:
        batch_op.drop_column("listing_quota")
        batch_op.drop_column("subscription_plan")
        batch_op.drop_column("verification_status")
        batch_op.drop_column("service_areas_json")
        batch_op.drop_column("social_links_json")
        batch_op.drop_column("website")

    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.drop_column("allow_marketing_emails")
        batch_op.drop_column("show_as_public_author")
        batch_op.drop_column("is_public_profile")
