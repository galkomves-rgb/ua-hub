"""relax legacy listing columns

Revision ID: f1e2d3c4b5a6
Revises: d7e8f9a0b1c2
Create Date: 2026-03-26 12:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "f1e2d3c4b5a6"
down_revision: Union[str, Sequence[str], None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("listings"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("listings")}

    with op.batch_alter_table("listings") as batch_op:
        if "short_desc" in existing_columns:
            batch_op.alter_column("short_desc", existing_type=sa.String(), nullable=True)
        if "author_type" in existing_columns:
            batch_op.alter_column("author_type", existing_type=sa.String(), nullable=True)
        if "author_name" in existing_columns:
            batch_op.alter_column("author_name", existing_type=sa.String(), nullable=True)
        if "is_active" in existing_columns:
            batch_op.alter_column("is_active", existing_type=sa.Boolean(), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("listings"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("listings")}

    with op.batch_alter_table("listings") as batch_op:
        if "is_active" in existing_columns:
            batch_op.alter_column("is_active", existing_type=sa.Boolean(), nullable=False)
        if "author_name" in existing_columns:
            batch_op.alter_column("author_name", existing_type=sa.String(), nullable=False)
        if "author_type" in existing_columns:
            batch_op.alter_column("author_type", existing_type=sa.String(), nullable=False)
        if "short_desc" in existing_columns:
            batch_op.alter_column("short_desc", existing_type=sa.String(), nullable=False)
