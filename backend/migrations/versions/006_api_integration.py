"""Persist mentor assignments and the ticket resolution timestamp."""
from alembic import op
import sqlalchemy as sa

revision = "006_api_integration"
down_revision = "005_team_description"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("subtopics")}
    fks = inspector.get_foreign_keys("subtopics")
    indexes = {index["name"] for index in inspector.get_indexes("subtopics")}
    with op.batch_alter_table("subtopics") as batch:
        if "mentor_id" not in columns:
            batch.add_column(sa.Column("mentor_id", sa.String(36), nullable=True))
        if not any(fk["constrained_columns"] == ["mentor_id"] for fk in fks):
            batch.create_foreign_key("fk_subtopics_mentor_id_users", "users", ["mentor_id"], ["id"], ondelete="SET NULL")
        if "ix_subtopics_mentor_id" not in indexes:
            batch.create_index("ix_subtopics_mentor_id", ["mentor_id"])
    if "resolved_at" not in {column["name"] for column in inspector.get_columns("support_tickets")}:
        op.add_column("support_tickets", sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True))
    # Legacy records have only their last update as a resolution reference.
    op.execute("UPDATE support_tickets SET resolved_at = updated_at WHERE status IN ('resolved', 'closed') AND resolved_at IS NULL")


def downgrade():
    op.drop_column("support_tickets", "resolved_at")
    with op.batch_alter_table("subtopics") as batch:
        batch.drop_index("ix_subtopics_mentor_id")
        batch.drop_constraint("fk_subtopics_mentor_id_users", type_="foreignkey")
        batch.drop_column("mentor_id")
