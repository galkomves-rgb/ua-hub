"""normalize business subscription plans

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-03-29 11:15:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE business_profiles
        SET subscription_plan = CASE subscription_plan
            WHEN 'basic' THEN 'business_presence'
            WHEN 'premium' THEN 'business_priority'
            WHEN 'business' THEN 'agency_starter'
            ELSE subscription_plan
        END
        """
    )
    op.execute(
        """
        UPDATE business_profiles
        SET subscription_requested_plan = CASE subscription_requested_plan
            WHEN 'basic' THEN 'business_presence'
            WHEN 'premium' THEN 'business_priority'
            WHEN 'business' THEN 'agency_starter'
            ELSE subscription_requested_plan
        END
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE business_profiles
        SET subscription_plan = CASE subscription_plan
            WHEN 'business_presence' THEN 'basic'
            WHEN 'business_priority' THEN 'premium'
            WHEN 'agency_starter' THEN 'business'
            ELSE subscription_plan
        END
        """
    )
    op.execute(
        """
        UPDATE business_profiles
        SET subscription_requested_plan = CASE subscription_requested_plan
            WHEN 'business_presence' THEN 'basic'
            WHEN 'business_priority' THEN 'premium'
            WHEN 'agency_starter' THEN 'business'
            ELSE subscription_requested_plan
        END
        """
    )
