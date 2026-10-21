"""003_add_announcements

Revision ID: 003_add_announcements
Revises: 002_add_whitelists
Create Date: 2026-10-15 23:00:00.000000

Adds the `announcements` table for HF-27 (Admin/BTC announcement CRUD).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_announcements'
down_revision: Union[str, None] = '003_submissions_and_audit_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'announcements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=32), nullable=False, server_default='info'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_announcements_id', 'announcements', ['id'], unique=False)
    op.create_index('ix_announcements_priority', 'announcements', ['priority'], unique=False)
    op.create_index('ix_announcements_created_at', 'announcements', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_announcements_created_at', table_name='announcements')
    op.drop_index('ix_announcements_priority', table_name='announcements')
    op.drop_index('ix_announcements_id', table_name='announcements')
    op.drop_table('announcements')
