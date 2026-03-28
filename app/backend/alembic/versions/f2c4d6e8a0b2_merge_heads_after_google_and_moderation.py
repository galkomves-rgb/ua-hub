"""merge alembic heads after google and moderation

Revision ID: f2c4d6e8a0b2
Revises: c1d2e3f4a5b6, e7f8a9b0c1d2
Create Date: 2026-03-28 21:10:00.000000
"""

from typing import Sequence, Union


revision: str = "f2c4d6e8a0b2"
down_revision: Union[str, Sequence[str], None] = ("c1d2e3f4a5b6", "e7f8a9b0c1d2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
