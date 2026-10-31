import pytest
from sqlalchemy import select

from app.models.user import User
from app.models.whitelist import WhitelistEntry
from app.models.checkpoint import AuditLog
from app.services.auth_service import AuthService
from app.repositories.whitelist_repo import whitelist_repo
from app.core.exceptions import AppException


def headers(user):
    return {"Authorization": "Bearer " + AuthService.create_user_token(user)}


async def seed(db):
    admin = User(email="bulk-admin@example.com", full_name="Admin", role="admin", approval_status="approved")
    users = [User(email=f"bulk-{i}@example.com", full_name=f"Candidate {i}", role="candidate", approval_status="pending") for i in range(3)]
    db.add_all([admin, *users])
    await db.commit()
    return admin, users


@pytest.mark.asyncio
async def test_bulk_snapshot_skips_changed_inactive_staff_and_new_arrivals(client, db_session):
    admin, users = await seed(db_session)
    users[1].approval_status = "rejected"
    users[2].is_active = False
    staff = User(email="pending-staff@example.com", full_name="Staff", role="mentor", approval_status="pending")
    new = User(email="new-arrival@example.com", full_name="New", role="candidate", approval_status="pending")
    db_session.add_all([staff, new, WhitelistEntry(email=users[0].email, is_active=False)])
    await db_session.commit()
    ids = [u.id for u in users] + [staff.id, "missing", users[0].id]
    response = await client.post("/api/v1/admin/candidates/approve-all", headers=headers(admin), json={"candidate_ids": ids})
    assert response.status_code == 200, response.text
    assert response.json()["data"] == {"approved_ids": [users[0].id], "approved_count": 1, "skipped_count": 4}
    for row in [*users, staff, new]: await db_session.refresh(row)
    assert users[0].approval_status == "approved"
    assert users[1].approval_status == "rejected"
    assert users[2].approval_status == staff.approval_status == new.approval_status == "pending"
    entries = (await db_session.execute(select(WhitelistEntry))).scalars().all()
    assert len(entries) == 1 and entries[0].is_active
    repeated = await client.post("/api/v1/admin/candidates/approve-all", headers=headers(admin), json={"candidate_ids": ids})
    assert repeated.json()["data"]["approved_count"] == 0
    pending = (await client.get("/api/v1/admin/candidates/pending", headers=headers(admin))).json()["data"]
    assert {row["id"] for row in pending} == {new.id}
    assert (await db_session.execute(select(AuditLog).where(AuditLog.action == "CANDIDATES_BULK_APPROVED"))).scalars().all()


@pytest.mark.asyncio
async def test_bulk_approves_all_and_persists_whitelist(client, db_session):
    admin, users = await seed(db_session)
    response = await client.post("/api/v1/admin/candidates/approve-all", headers=headers(admin), json={"candidate_ids": [u.id for u in users]})
    assert response.status_code == 200 and response.json()["data"]["approved_count"] == 3
    assert (await client.get("/api/v1/admin/candidates/pending", headers=headers(admin))).json()["data"] == []
    entries = (await db_session.execute(select(WhitelistEntry))).scalars().all()
    assert {e.email for e in entries} == {u.email for u in users}


@pytest.mark.asyncio
async def test_bulk_requires_admin_and_explicit_nonempty_snapshot(client, db_session):
    admin, users = await seed(db_session)
    body = {"candidate_ids": [users[0].id]}
    assert (await client.post("/api/v1/admin/candidates/approve-all", json=body)).status_code == 401
    assert (await client.post("/api/v1/admin/candidates/approve-all", headers=headers(users[0]), json=body)).status_code == 403
    for payload in [{}, {"candidate_ids": []}]:
        assert (await client.post("/api/v1/admin/candidates/approve-all", headers=headers(admin), json=payload)).status_code == 422


@pytest.mark.asyncio
async def test_bulk_rolls_back_every_account_and_whitelist_on_failure(client, db_session, monkeypatch):
    admin, users = await seed(db_session)
    original = whitelist_repo.add_email
    calls = 0

    async def failing(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise AppException(status_code=500, message="Test transaction failure", error_code="TEST_FAILURE")
        return await original(*args, **kwargs)

    monkeypatch.setattr(whitelist_repo, "add_email", failing)
    response = await client.post("/api/v1/admin/candidates/approve-all", headers=headers(admin), json={"candidate_ids": [u.id for u in users]})
    assert response.status_code == 500
    for row in users:
        await db_session.refresh(row)
        assert row.approval_status == "pending"
    assert not (await db_session.execute(select(WhitelistEntry))).scalars().all()
