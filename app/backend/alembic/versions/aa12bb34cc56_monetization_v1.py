"""monetization v1

Revision ID: aa12bb34cc56
Revises: f1e2d3c4b5a6
Create Date: 2026-03-26 15:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "aa12bb34cc56"
down_revision: Union[str, Sequence[str], None] = "f1e2d3c4b5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    listing_columns = {column["name"] for column in inspector.get_columns("listings")} if inspector.has_table("listings") else set()
    if inspector.has_table("listings"):
        with op.batch_alter_table("listings") as batch_op:
            if "pricing_tier" not in listing_columns:
                batch_op.add_column(sa.Column("pricing_tier", sa.String(length=50), server_default="free", nullable=False))
            if "visibility" not in listing_columns:
                batch_op.add_column(sa.Column("visibility", sa.String(length=50), server_default="standard", nullable=False))
            if "ranking_score" not in listing_columns:
                batch_op.add_column(sa.Column("ranking_score", sa.Integer(), server_default="0", nullable=False))

    if not inspector.has_table("listing_promotions"):
        op.create_table(
            "listing_promotions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("listing_id", sa.Integer(), nullable=False),
            sa.Column("payment_id", sa.Integer(), nullable=True),
            sa.Column("promotion_type", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="active"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["payment_id"], ["billing_payments.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_listing_promotions_id"), "listing_promotions", ["id"], unique=False)
        op.create_index(op.f("ix_listing_promotions_listing_id"), "listing_promotions", ["listing_id"], unique=False)
        op.create_index(op.f("ix_listing_promotions_payment_id"), "listing_promotions", ["payment_id"], unique=False)
        op.create_index(op.f("ix_listing_promotions_promotion_type"), "listing_promotions", ["promotion_type"], unique=False)
        op.create_index(op.f("ix_listing_promotions_status"), "listing_promotions", ["status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("listing_promotions"):
        op.drop_index(op.f("ix_listing_promotions_status"), table_name="listing_promotions")
        op.drop_index(op.f("ix_listing_promotions_promotion_type"), table_name="listing_promotions")
        op.drop_index(op.f("ix_listing_promotions_payment_id"), table_name="listing_promotions")
        op.drop_index(op.f("ix_listing_promotions_listing_id"), table_name="listing_promotions")
        op.drop_index(op.f("ix_listing_promotions_id"), table_name="listing_promotions")
        op.drop_table("listing_promotions")

    listing_columns = {column["name"] for column in inspector.get_columns("listings")} if inspector.has_table("listings") else set()
    if inspector.has_table("listings"):
        with op.batch_alter_table("listings") as batch_op:
            if "ranking_score" in listing_columns:
                batch_op.drop_column("ranking_score")
            if "visibility" in listing_columns:
                batch_op.drop_column("visibility")
            if "pricing_tier" in listing_columns:
                batch_op.drop_column("pricing_tier")
