"""002_add_whitelists

Revision ID: 002_add_whitelists
Revises: 001_initial_schema
Create Date: 2026-10-02 23:25:00.000000

Adds the `whitelists` table that stores BTC-approved candidate emails.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_whitelists'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'whitelists',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('added_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_whitelists_email', 'whitelists', ['email'], unique=True)
    op.create_index('ix_whitelists_is_active', 'whitelists', ['is_active'], unique=False)
    op.create_index('ix_whitelists_added_by', 'whitelists', ['added_by'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_whitelists_added_by', table_name='whitelists')
    op.drop_index('ix_whitelists_is_active', table_name='whitelists')
    op.drop_index('ix_whitelists_email', table_name='whitelists')
    op.drop_table('whitelists')
