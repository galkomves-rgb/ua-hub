"""Update listings table schema and add profile tables

Revision ID: add_profiles_and_update_listings
Revises: 4d2b749fda2c
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_profiles_and_update_listings'
down_revision = '4d2b749fda2c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.String(length=1024), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('bio', sa.String(length=500), nullable=False),
        sa.Column('preferred_language', sa.String(length=10), server_default='ua', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)

    # Create business_profiles table
    op.create_table(
        'business_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_user_id', sa.String(), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('logo_url', sa.String(length=1024), nullable=True),
        sa.Column('cover_url', sa.String(length=1024), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('contacts_json', sa.String(length=1000), server_default='{}', nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_premium', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('tags_json', sa.String(length=500), server_default='[]', nullable=False),
        sa.Column('rating', sa.String(length=10), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index(op.f('ix_business_profiles_owner_user_id'), 'business_profiles', ['owner_user_id'])
    op.create_index(op.f('ix_business_profiles_slug'), 'business_profiles', ['slug'], unique=True)

    # Update listings table in batch mode so SQLite validation can run locally too.
    with op.batch_alter_table('listings') as batch_op:
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('owner_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('owner_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('subcategory', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('region', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('images_json', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(length=50), server_default='active', nullable=False))
        batch_op.add_column(sa.Column('is_featured', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        batch_op.add_column(sa.Column('is_promoted', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        batch_op.add_column(sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        batch_op.add_column(sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))

    # Migrate old columns to new ones
    op.execute(
        sa.text("""
        UPDATE listings
        SET
            description = COALESCE(short_desc, ''),
            owner_type = author_type,
            owner_id = author_name,
            updated_at = created_at
        WHERE description IS NULL
        """)
    )

    # Set status based on is_active
    op.execute(
        sa.text("""
        UPDATE listings
        SET status = CASE WHEN is_active = true THEN 'active' ELSE 'expired' END
        WHERE status = 'active'
        """)
    )

    with op.batch_alter_table('listings') as batch_op:
        batch_op.alter_column('description', existing_type=sa.Text(), nullable=False)
        batch_op.alter_column('owner_type', existing_type=sa.String(), nullable=False)
        batch_op.alter_column('owner_id', existing_type=sa.String(), nullable=False)
        batch_op.alter_column('updated_at', existing_type=sa.DateTime(timezone=True), nullable=False)


def downgrade() -> None:
    # Drop profile tables
    op.drop_table('business_profiles')
    op.drop_table('user_profiles')

    with op.batch_alter_table('listings') as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('expiry_date')
        batch_op.drop_column('is_verified')
        batch_op.drop_column('is_promoted')
        batch_op.drop_column('is_featured')
        batch_op.drop_column('status')
        batch_op.drop_column('images_json')
        batch_op.drop_column('region')
        batch_op.drop_column('subcategory')
        batch_op.drop_column('owner_id')
        batch_op.drop_column('owner_type')
        batch_op.drop_column('description')
