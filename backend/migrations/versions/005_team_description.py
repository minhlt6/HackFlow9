"""Merge migration heads and persist team descriptions."""
from alembic import op
import sqlalchemy as sa

revision = "005_team_description"
down_revision = ("004_rubrics_and_evaluations", "003_add_announcements")
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("checkpoints", sa.Column("weight", sa.Float(), nullable=False, server_default="0"))
    op.add_column("checkpoints", sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("notification_state", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("announcements", sa.Column("target_audience", sa.String(32), nullable=False, server_default="all"))
    op.add_column("support_tickets", sa.Column("messages", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("hackathon_config", sa.Column("settings_data", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("teams", sa.Column("description", sa.String(2000), nullable=True))

def downgrade():
    op.drop_column("checkpoints", "display_order")
    op.drop_column("checkpoints", "weight")
    op.drop_column("users", "notification_state")
    op.drop_column("announcements", "target_audience")
    op.drop_column("support_tickets", "messages")
    op.drop_column("hackathon_config", "settings_data")
    op.drop_column("teams", "description")
