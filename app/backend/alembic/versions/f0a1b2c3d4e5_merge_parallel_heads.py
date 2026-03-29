"""merge parallel heads

Revision ID: f0a1b2c3d4e5
Revises: ab34cd56ef78, c3d4e5f6a7b8, e7f8a9b0c1d2
Create Date: 2026-03-29 21:15:00.000000
"""

from typing import Sequence, Union


revision: str = "f0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = (
    "ab34cd56ef78",
    "c3d4e5f6a7b8",
    "e7f8a9b0c1d2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
