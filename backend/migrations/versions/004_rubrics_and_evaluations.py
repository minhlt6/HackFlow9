"""004_rubrics_and_evaluations

Revision ID: 004_rubrics_and_evaluations
Revises: 003_submissions_and_audit_logs
Create Date: 2026-10-18 01:35:00.000000

Adds HF-42 columns to `rubric_criteria` and `evaluations`,
creates unique constraint `uq_eval_submission_judge_criteria` on `evaluations`,
and creates the `judge_assignments` table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_rubrics_and_evaluations"
down_revision: Union[str, None] = "003_submissions_and_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Upgrade rubric_criteria table
    op.add_column(
        "rubric_criteria",
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "rubric_criteria",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "rubric_criteria",
        sa.Column(
            "rubric_name",
            sa.String(length=128),
            nullable=False,
            server_default="HackFlow Final Rubric",
        ),
    )

    # 2. Upgrade evaluations table
    op.add_column(
        "evaluations",
        sa.Column("general_comment", sa.Text(), nullable=True),
    )
    op.add_column(
        "evaluations",
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
    )
    op.add_column(
        "evaluations",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_evaluations_status", "evaluations", ["status"], unique=False)
    op.create_unique_constraint(
        "uq_eval_submission_judge_criteria",
        "evaluations",
        ["submission_id", "judge_id", "criteria_id"],
    )

    # 3. Create judge_assignments table
    op.create_table(
        "judge_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("judge_id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=True),
        sa.Column("team_id", sa.String(length=36), nullable=True),
        sa.Column("assigned_by", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["judge_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "judge_id", "submission_id", name="uq_judge_assignment_judge_submission"
        ),
    )
    op.create_index("ix_judge_assignments_judge_id", "judge_assignments", ["judge_id"], unique=False)
    op.create_index(
        "ix_judge_assignments_submission_id", "judge_assignments", ["submission_id"], unique=False
    )
    op.create_index("ix_judge_assignments_team_id", "judge_assignments", ["team_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_judge_assignments_team_id", table_name="judge_assignments")
    op.drop_index("ix_judge_assignments_submission_id", table_name="judge_assignments")
    op.drop_index("ix_judge_assignments_judge_id", table_name="judge_assignments")
    op.drop_table("judge_assignments")

    op.drop_constraint("uq_eval_submission_judge_criteria", "evaluations", type_="unique")
    op.drop_index("ix_evaluations_status", table_name="evaluations")
    op.drop_column("evaluations", "submitted_at")
    op.drop_column("evaluations", "status")
    op.drop_column("evaluations", "general_comment")

    op.drop_column("rubric_criteria", "rubric_name")
    op.drop_column("rubric_criteria", "display_order")
    op.drop_column("rubric_criteria", "is_required")
