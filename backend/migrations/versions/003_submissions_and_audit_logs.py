"""003_submissions_and_audit_logs

Revision ID: 003_submissions_and_audit_logs
Revises: 002_add_whitelists
Create Date: 2026-10-16 17:38:00.000000

Adds HF-23 / HF-32 / HF-34 columns on `checkpoints` and `submissions`,
adds unique constraint `(team_id, checkpoint_id)` on `submissions`,
and creates the `audit_logs` table for submission & checkpoint auditing.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_submissions_and_audit_logs"
down_revision: Union[str, None] = "002_add_whitelists"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add HF-23 columns to checkpoints
    op.add_column(
        "checkpoints",
        sa.Column("is_final_checkpoint", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "checkpoints",
        sa.Column("grace_period_seconds", sa.Integer(), nullable=False, server_default="5"),
    )
    op.add_column(
        "checkpoints",
        sa.Column("submission_fields", sa.JSON(), nullable=True),
    )

    # 2. Alter submissions columns and add HF-34 fields
    op.alter_column("submissions", "repo_url", existing_type=sa.String(length=255), nullable=True)
    op.alter_column("submissions", "commit_sha", existing_type=sa.String(length=64), nullable=True)
    op.add_column(
        "submissions",
        sa.Column("submitted_by", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column("submission_data", sa.JSON(), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column("note", sa.Text(), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column("grace_period_applied", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "submissions",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "submissions",
        sa.Column("version_history", sa.JSON(), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
    )
    op.create_foreign_key(
        "fk_submissions_submitted_by_users",
        "submissions",
        "users",
        ["submitted_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_submissions_submitted_by", "submissions", ["submitted_by"], unique=False)
    op.create_index("ix_submissions_idempotency_key", "submissions", ["idempotency_key"], unique=False)
    op.create_unique_constraint(
        "uq_submission_team_checkpoint", "submissions", ["team_id", "checkpoint_id"]
    )

    # 3. Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("team_id", sa.String(length=36), nullable=True),
        sa.Column("checkpoint_id", sa.String(length=36), nullable=True),
        sa.Column("submission_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("late_grace_period", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("commit_sha", sa.String(length=64), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["checkpoint_id"], ["checkpoints.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"], unique=False)
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)
    op.create_index("ix_audit_logs_team_id", "audit_logs", ["team_id"], unique=False)
    op.create_index("ix_audit_logs_checkpoint_id", "audit_logs", ["checkpoint_id"], unique=False)
    op.create_index("ix_audit_logs_submission_id", "audit_logs", ["submission_id"], unique=False)
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
    op.create_index("ix_audit_logs_status", "audit_logs", ["status"], unique=False)
    op.create_index(
        "ix_audit_logs_late_grace_period", "audit_logs", ["late_grace_period"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_late_grace_period", table_name="audit_logs")
    op.drop_index("ix_audit_logs_status", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_submission_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_checkpoint_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_team_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_constraint("uq_submission_team_checkpoint", "submissions", type_="unique")
    op.drop_index("ix_submissions_idempotency_key", table_name="submissions")
    op.drop_index("ix_submissions_submitted_by", table_name="submissions")
    op.drop_constraint("fk_submissions_submitted_by_users", "submissions", type_="foreignkey")
    op.drop_column("submissions", "idempotency_key")
    op.drop_column("submissions", "version_history")
    op.drop_column("submissions", "version")
    op.drop_column("submissions", "grace_period_applied")
    op.drop_column("submissions", "note")
    op.drop_column("submissions", "submission_data")
    op.drop_column("submissions", "submitted_by")
    op.alter_column("submissions", "commit_sha", existing_type=sa.String(length=64), nullable=False)
    op.alter_column("submissions", "repo_url", existing_type=sa.String(length=255), nullable=False)

    op.drop_column("checkpoints", "submission_fields")
    op.drop_column("checkpoints", "grace_period_seconds")
    op.drop_column("checkpoints", "is_final_checkpoint")
