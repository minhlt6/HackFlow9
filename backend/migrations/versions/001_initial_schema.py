"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-02 21:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('approval_status', sa.String(length=32), nullable=False),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('github_id', sa.String(length=64), nullable=True),
        sa.Column('github_username', sa.String(length=128), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_github_id'), 'users', ['github_id'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_approval_status'), 'users', ['approval_status'], unique=False)

    # 2. topics
    op.create_table(
        'topics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_teams', sa.Integer(), nullable=False),
        sa.Column('current_teams', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_topics_id'), 'topics', ['id'], unique=False)
    op.create_index(op.f('ix_topics_title'), 'topics', ['title'], unique=True)

    # 3. subtopics
    op.create_table(
        'subtopics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('topic_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_teams', sa.Integer(), nullable=False),
        sa.Column('current_teams', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subtopics_id'), 'subtopics', ['id'], unique=False)
    op.create_index(op.f('ix_subtopics_topic_id'), 'subtopics', ['topic_id'], unique=False)
    op.create_index(op.f('ix_subtopics_title'), 'subtopics', ['title'], unique=False)

    # 4. teams
    op.create_table(
        'teams',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_name', sa.String(length=128), nullable=False),
        sa.Column('invite_code', sa.String(length=16), nullable=False),
        sa.Column('topic_id', sa.String(length=36), nullable=True),
        sa.Column('subtopic_id', sa.String(length=36), nullable=True),
        sa.Column('is_locked', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['subtopic_id'], ['subtopics.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_teams_id'), 'teams', ['id'], unique=False)
    op.create_index(op.f('ix_teams_team_name'), 'teams', ['team_name'], unique=True)
    op.create_index(op.f('ix_teams_invite_code'), 'teams', ['invite_code'], unique=True)
    op.create_index(op.f('ix_teams_topic_id'), 'teams', ['topic_id'], unique=False)
    op.create_index(op.f('ix_teams_subtopic_id'), 'teams', ['subtopic_id'], unique=False)

    # 5. team_members
    op.create_table(
        'team_members',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_team_members_id'), 'team_members', ['id'], unique=False)
    op.create_index(op.f('ix_team_members_team_id'), 'team_members', ['team_id'], unique=False)
    op.create_index(op.f('ix_team_members_user_id'), 'team_members', ['user_id'], unique=False)

    # 6. checkpoints
    op.create_table(
        'checkpoints',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=False),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_checkpoints_id'), 'checkpoints', ['id'], unique=False)
    op.create_index(op.f('ix_checkpoints_title'), 'checkpoints', ['title'], unique=False)
    op.create_index(op.f('ix_checkpoints_deadline'), 'checkpoints', ['deadline'], unique=False)

    # 7. submissions
    op.create_table(
        'submissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('checkpoint_id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('repo_url', sa.String(length=255), nullable=False),
        sa.Column('demo_url', sa.String(length=255), nullable=True),
        sa.Column('commit_sha', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['checkpoint_id'], ['checkpoints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_id'), 'submissions', ['id'], unique=False)
    op.create_index(op.f('ix_submissions_checkpoint_id'), 'submissions', ['checkpoint_id'], unique=False)
    op.create_index(op.f('ix_submissions_team_id'), 'submissions', ['team_id'], unique=False)
    op.create_index(op.f('ix_submissions_commit_sha'), 'submissions', ['commit_sha'], unique=False)
    op.create_index(op.f('ix_submissions_status'), 'submissions', ['status'], unique=False)

    # 8. rubric_criteria
    op.create_table(
        'rubric_criteria',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_score', sa.Float(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rubric_criteria_id'), 'rubric_criteria', ['id'], unique=False)
    op.create_index(op.f('ix_rubric_criteria_title'), 'rubric_criteria', ['title'], unique=False)

    # 9. evaluations
    op.create_table(
        'evaluations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('submission_id', sa.String(length=36), nullable=False),
        sa.Column('judge_id', sa.String(length=36), nullable=False),
        sa.Column('criteria_id', sa.String(length=36), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['judge_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['criteria_id'], ['rubric_criteria.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evaluations_id'), 'evaluations', ['id'], unique=False)
    op.create_index(op.f('ix_evaluations_submission_id'), 'evaluations', ['submission_id'], unique=False)
    op.create_index(op.f('ix_evaluations_judge_id'), 'evaluations', ['judge_id'], unique=False)
    op.create_index(op.f('ix_evaluations_criteria_id'), 'evaluations', ['criteria_id'], unique=False)

    # 10. support_tickets
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=True),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_to', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('priority', sa.String(length=16), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('response', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_tickets_id'), 'support_tickets', ['id'], unique=False)
    op.create_index(op.f('ix_support_tickets_team_id'), 'support_tickets', ['team_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_user_id'), 'support_tickets', ['user_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_assigned_to'), 'support_tickets', ['assigned_to'], unique=False)
    op.create_index(op.f('ix_support_tickets_title'), 'support_tickets', ['title'], unique=False)
    op.create_index(op.f('ix_support_tickets_status'), 'support_tickets', ['status'], unique=False)

    # 11. hackathon_config
    op.create_table(
        'hackathon_config',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_topic_published', sa.Boolean(), nullable=False),
        sa.Column('is_result_published', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hackathon_config_id'), 'hackathon_config', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('hackathon_config')
    op.drop_table('support_tickets')
    op.drop_table('evaluations')
    op.drop_table('rubric_criteria')
    op.drop_table('submissions')
    op.drop_table('checkpoints')
    op.drop_table('team_members')
    op.drop_table('teams')
    op.drop_table('subtopics')
    op.drop_table('topics')
    op.drop_table('users')
