"""Exercise migration 006 on a legacy schema and a schema updated by startup."""
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


@pytest.mark.parametrize("startup_columns", [False, True])
def test_migration_preserves_records_and_supports_existing_columns(startup_columns):
    spec = importlib.util.spec_from_file_location(
        "api_migration", Path(__file__).parents[1] / "migrations/versions/006_api_integration.py"
    )
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE subtopics (id VARCHAR(36) PRIMARY KEY, title VARCHAR(128))")
        connection.exec_driver_sql("CREATE TABLE support_tickets (id VARCHAR(36) PRIMARY KEY, status VARCHAR(32), updated_at DATETIME)")
        connection.exec_driver_sql("INSERT INTO subtopics (id,title) VALUES ('sub-1','Keep this topic')")
        connection.exec_driver_sql("INSERT INTO support_tickets VALUES ('ticket-1','resolved','2026-10-27 10:00:00')")
        if startup_columns:
            connection.exec_driver_sql("ALTER TABLE subtopics ADD COLUMN mentor_id VARCHAR(36)")
            connection.exec_driver_sql("ALTER TABLE support_tickets ADD COLUMN resolved_at DATETIME")
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            migration.upgrade()  # No duplicate columns if startup or a retry already added them.
            assert connection.exec_driver_sql("SELECT title FROM subtopics").scalar_one() == "Keep this topic"
            assert connection.exec_driver_sql("SELECT resolved_at FROM support_tickets").scalar_one() == "2026-10-27 10:00:00"
            foreign_keys = sa.inspect(connection).get_foreign_keys("subtopics")
            assert any(fk["constrained_columns"] == ["mentor_id"] for fk in foreign_keys)
            migration.downgrade()
            assert "mentor_id" not in {c["name"] for c in sa.inspect(connection).get_columns("subtopics")}
            assert connection.exec_driver_sql("SELECT title FROM subtopics").scalar_one() == "Keep this topic"
    engine.dispose()
