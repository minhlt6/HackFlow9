"""Regression tests for API contracts and persistence behind BUG-35 through BUG-40."""
import asyncio

import pytest
from sqlalchemy import select

from app.models.team import Team, TeamMember
from app.models.user import User
from tests.conftest import TestSessionLocal
from tests.test_teams import create_test_user


ADMIN = {"Authorization": "Bearer mock-jwt-token-admin"}


async def make_team(client, count=3, approved=False, locked=False):
    users, headers = [], []
    async with TestSessionLocal() as db:
        for i in range(count):
            user, token = await create_test_user(db, f"regression{i}@example.com", f"Member {i}")
            users.append(str(user.id))
            headers.append({"Authorization": f"Bearer {token}"})
    created = await client.post("/api/v1/teams", headers=headers[0], json={"team_name": "Regression Team"})
    assert created.status_code == 201
    team = created.json()["data"]
    for header in headers[1:]:
        joined = await client.post("/api/v1/teams/join", headers=header, json={"invite_code": team["invite_code"]})
        assert joined.status_code == 200
    async with TestSessionLocal() as db:
        row = await db.get(Team, team["id"])
        row.is_locked = locked
        row.admin_meta = {"approval_status": "approved" if approved else "pending"}
        await db.commit()
    return team["id"], users, headers


@pytest.mark.asyncio
async def test_unique_team_name_code_and_admin_list(client):
    tid, _, headers = await make_team(client)
    original = (await client.get(f"/api/v1/teams/{tid}", headers=headers[0])).json()["data"]
    for payload, code in [
        ({"name": "  regression TEAM ", "leaderEmail": "new@example.com"}, "TEAM_NAME_TAKEN"),
        ({"name": "Different Team", "inviteCode": original["invite_code"].lower(), "leaderEmail": "new@example.com"}, "INVITE_CODE_TAKEN"),
    ]:
        response = await client.post("/api/v1/admin/teams", headers=ADMIN, json=payload)
        assert response.status_code == 409
        assert response.json()["error_code"] == code
    rows = (await client.get("/api/v1/admin/teams", headers=ADMIN)).json()["data"]
    assert [row["id"] for row in rows] == [tid]
    async with TestSessionLocal() as db:
        assert len((await db.execute(select(Team))).scalars().all()) == 1


@pytest.mark.asyncio
async def test_config_and_team_limits_are_persisted_and_consistent(client):
    tid, _, headers = await make_team(client)
    original = (await client.get("/api/v1/admin/config", headers=ADMIN)).json()["data"]
    response = await client.patch("/api/v1/admin/config", headers=ADMIN, json={
        "name": "Config regression", "minTeamMembers": 2, "maxTeamMembers": 6,
        "end_time": original["end_time"],
    })
    assert response.status_code == 200
    saved = response.json()["data"]
    for route in ("/api/v1/admin/config", "/api/v1/config"):
        loaded = (await client.get(route, headers=ADMIN)).json()["data"]
        assert loaded["name"] == "Config regression"
        assert loaded["minTeamMembers"] == loaded["minTeamSize"] == 2
        assert loaded["maxTeamMembers"] == loaded["maxTeamSize"] == 6
        assert loaded["end_time"] == saved["end_time"]
    for route in ("/api/v1/teams/me", f"/api/v1/teams/{tid}", "/api/v1/teams", "/api/v1/admin/teams"):
        loaded = (await client.get(route, headers=headers[0] if "/admin/" not in route else ADMIN)).json()["data"]
        team = loaded[0] if isinstance(loaded, list) else loaded
        assert (team["min_members"], team["max_members"], team["member_count"]) == (2, 6, 3)


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["judge", "mentor"])
async def test_create_personnel_persists_login_and_duplicate_is_not_upsert(client, role):
    payload = {"full_name": "New Expert", "email": "expert@example.com", "role": role, "specialty": "Data systems"}
    created = await client.post("/api/v1/admin/personnel", headers=ADMIN, json=payload)
    assert created.status_code == 201
    uid = created.json()["data"]["id"]
    duplicate = await client.post("/api/v1/admin/personnel", headers=ADMIN, json={
        **payload, "email": " EXPERT@EXAMPLE.COM ", "role": "mentor" if role == "judge" else "judge", "full_name": "Overwrite attempt",
    })
    assert duplicate.status_code == 409
    assert duplicate.json()["error_code"] == "EMAIL_ALREADY_EXISTS"
    async with TestSessionLocal() as db:
        user = await db.get(User, uid)
        assert (user.full_name, user.role, user.email) == ("New Expert", role, "expert@example.com")
        assert user.profile_meta["specialty"] == "Data systems"
    roster = (await client.get("/api/v1/admin/personnel", headers=ADMIN)).json()["data"]
    assert len([row for row in roster if row["id"] == uid]) == 1
    login = await client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "123456"})
    assert login.status_code == 200
    assert login.json()["data"]["user"]["role"] == role
    deleted = await client.delete(f"/api/v1/admin/personnel/{uid}", headers=ADMIN)
    assert deleted.status_code == 200
    roster = (await client.get("/api/v1/admin/personnel", headers=ADMIN)).json()["data"]
    assert all(row["id"] != uid for row in roster)


@pytest.mark.asyncio
async def test_create_personnel_cannot_promote_candidate_or_admin(client):
    async with TestSessionLocal() as db:
        user, _ = await create_test_user(db, "existing@example.com", "Original")
        uid = str(user.id)
    for email in ("existing@example.com", "admin@hackflow.dev"):
        response = await client.post("/api/v1/admin/personnel", headers=ADMIN, json={"email": email, "full_name": "Replacement", "role": "judge"})
        assert response.status_code == 409
    async with TestSessionLocal() as db:
        user = await db.get(User, uid)
        assert (user.full_name, user.role) == ("Original", "candidate")


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    {"email": "invalid", "full_name": "Expert", "role": "judge"},
    {"email": "expert@example.com", "full_name": " ", "role": "judge"},
    {"email": "expert@example.com", "full_name": "Expert", "role": "admin"},
])
async def test_invalid_personnel_is_not_persisted(client, payload):
    response = await client.post("/api/v1/admin/personnel", headers=ADMIN, json=payload)
    assert response.status_code in (400, 422)
    async with TestSessionLocal() as db:
        rows = (await db.execute(select(User).where(User.role.in_(["mentor", "judge"])))).scalars().all()
        assert rows == []


@pytest.mark.asyncio
@pytest.mark.parametrize("locked,approved,error_code", [(True, False, "TEAM_LOCKED"), (False, True, "TEAM_MIN_MEMBERS")])
async def test_removal_and_leave_are_rejected_without_changing_db(client, locked, approved, error_code):
    tid, users, headers = await make_team(client, locked=locked, approved=approved)
    response = await client.delete(f"/api/v1/teams/members/{users[1]}", headers=headers[0])
    assert response.status_code == 409
    assert response.json()["error_code"] == error_code
    response = await client.post("/api/v1/teams/leave", headers=headers[1])
    assert response.status_code == 409
    assert response.json()["error_code"] == error_code
    loaded = (await client.get("/api/v1/teams/me", headers=headers[0])).json()["data"]
    assert loaded["member_count"] == 3
    async with TestSessionLocal() as db:
        assert len((await db.execute(select(TeamMember).where(TeamMember.team_id == tid))).scalars().all()) == 3


@pytest.mark.asyncio
async def test_allowed_remove_and_missing_member_persist_correctly(client):
    tid, users, headers = await make_team(client)
    response = await client.delete(f"/api/v1/teams/members/{users[1]}", headers=headers[0])
    assert response.status_code == 200
    assert response.json()["data"]["member_count"] == 2
    assert (await client.get("/api/v1/teams/me", headers=headers[1])).json()["data"] is None
    assert (await client.get("/api/v1/teams/me", headers=headers[0])).json()["data"]["member_count"] == 2
    missing = await client.delete(f"/api/v1/teams/members/{users[1]}", headers=headers[0])
    assert missing.status_code == 404
    forbidden = await client.delete(f"/api/v1/teams/members/{users[0]}", headers=headers[2])
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_two_removals_do_not_drop_participating_team_below_min(client):
    tid, users, headers = await make_team(client, count=4, approved=True)
    responses = await asyncio.gather(*[
        client.delete(f"/api/v1/teams/members/{uid}", headers=headers[0]) for uid in users[1:3]
    ])
    assert sorted(response.status_code for response in responses) == [200, 409]
    loaded = (await client.get("/api/v1/teams/me", headers=headers[0])).json()["data"]
    assert loaded["member_count"] == 3


@pytest.mark.asyncio
async def test_review_snapshot_survives_membership_change_and_reapproval(client):
    tid, users, headers = await make_team(client)
    invalid = await client.patch(f"/api/v1/admin/teams/{tid}/reject", headers=ADMIN, json={"reason": "Thiếu thành viên", "reason_code": "under_min"})
    assert invalid.status_code == 409
    await client.delete(f"/api/v1/teams/members/{users[1]}", headers=headers[0])
    rejected = await client.patch(f"/api/v1/admin/teams/{tid}/reject", headers=ADMIN, json={"reason": "Thiếu thành viên", "reason_code": "under_min"})
    assert rejected.status_code == 200
    review = rejected.json()["data"]["last_review"]
    assert (review["decision"], review["member_count"], review["min_members"]) == ("rejected", 2, 3)
    loaded = (await client.get("/api/v1/admin/teams", headers=ADMIN)).json()["data"][0]
    assert loaded["last_review"] == review
    assert loaded["review_history"] == [review]
    code = loaded["invite_code"]
    joined = await client.post("/api/v1/teams/join", headers=headers[1], json={"invite_code": code})
    assert joined.status_code == 200
    loaded = (await client.get("/api/v1/admin/teams", headers=ADMIN)).json()["data"][0]
    assert loaded["member_count"] == 3
    assert loaded["last_review"]["member_count"] == 2
    approved = await client.patch(f"/api/v1/admin/teams/{tid}/approve", headers=ADMIN)
    assert approved.status_code == 200
    assert approved.json()["data"]["rejection_reason"] is None
    assert [review["decision"] for review in approved.json()["data"]["review_history"]] == ["rejected", "approved"]


@pytest.mark.asyncio
async def test_bulk_approve_skips_invalid_teams(client):
    tid, users, headers = await make_team(client)
    await client.delete(f"/api/v1/teams/members/{users[1]}", headers=headers[0])
    response = await client.post("/api/v1/admin/teams/bulk-approve", headers=ADMIN, json={"team_ids": [tid]})
    assert response.status_code == 200
    assert response.json()["data"]["approved_count"] == 0
    assert response.json()["data"]["skipped_ids"] == [tid]
    assert response.json()["data"]["teams"][0]["is_locked"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    {"minTeamSize": 2.5}, {"minTeamMembers": True}, {"maxTeamMembers": 0},
    {"minTeamSize": 2, "minTeamMembers": 3}, {"minTeamMembers": 7, "maxTeamMembers": 6},
    {"end_time": "invalid-time"},
])
async def test_invalid_config_does_not_change_saved_values(client, payload):
    before = (await client.get("/api/v1/admin/config", headers=ADMIN)).json()["data"]
    response = await client.patch("/api/v1/admin/config", headers=ADMIN, json={"name": "Must rollback", **payload})
    assert response.status_code == 400
    after = (await client.get("/api/v1/admin/config", headers=ADMIN)).json()["data"]
    assert after == before


@pytest.mark.asyncio
async def test_related_team_writes_persist_and_permissions_follow_transfer(client):
    tid, users, headers = await make_team(client)
    description = await client.patch("/api/v1/teams/me", headers=headers[0], json={"description": "Persisted team description"})
    assert description.status_code == 200
    skills = await client.patch(f"/api/v1/teams/members/{users[1]}/skills", headers=headers[0], json={"skills": ["Python", "SQL"]})
    assert skills.status_code == 200
    transfer = await client.patch("/api/v1/teams/leader", headers=headers[0], json={"new_leader_id": users[1]})
    assert transfer.status_code == 200
    loaded = (await client.get("/api/v1/teams/me", headers=headers[1])).json()["data"]
    assert loaded["leader_id"] == users[1]
    assert loaded["description"] == "Persisted team description"
    assert next(m for m in loaded["members"] if m["user_id"] == users[1])["skills"] == ["Python", "SQL"]
    forbidden = await client.delete(f"/api/v1/teams/members/{users[2]}", headers=headers[0])
    assert forbidden.status_code == 403
    removed = await client.delete(f"/api/v1/teams/members/{users[2]}", headers=headers[1])
    assert removed.status_code == 200
    assert removed.json()["data"]["member_count"] == 2


@pytest.mark.asyncio
async def test_auto_match_obeys_custom_limits_and_persists(client):
    await client.patch("/api/v1/admin/config", headers=ADMIN, json={"minTeamMembers": 2, "maxTeamMembers": 6})
    async with TestSessionLocal() as db:
        for i in range(11):
            await create_test_user(db, f"matching{i}@example.com", f"Candidate {i}")
    response = await client.post("/api/v1/admin/teams/auto-match", headers=ADMIN, json={"target_team_size": 6, "auto_assign_topics": False})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["matched_candidates_count"] == 11
    assert sorted(t["member_count"] for t in data["teams"]) == [5, 6]
    teams = (await client.get("/api/v1/admin/teams", headers=ADMIN)).json()["data"]
    assert sorted(t["member_count"] for t in teams) == [5, 6]
    assert all(t["min_members"] == 2 and t["max_members"] == 6 for t in teams)


@pytest.mark.asyncio
async def test_config_utc_timestamp_and_phase_toggle_round_trip(client):
    from datetime import datetime, timezone
    instant = "2026-12-31T11:00:37.123Z"
    response = await client.patch("/api/v1/admin/config", headers=ADMIN, json={"end_time": instant, "currentPhase": "Hội đồng chấm thi độc lập"})
    assert response.status_code == 200
    saved = response.json()["data"]
    assert saved["status"] == "judging"
    parsed = datetime.fromisoformat(saved["end_time"])
    assert parsed.tzinfo is not None
    assert parsed == datetime(2026, 12, 31, 11, 0, 37, 123000, tzinfo=timezone.utc)
    toggled = await client.patch("/api/v1/admin/config", headers=ADMIN, json={"status": "hacking"})
    assert toggled.json()["data"]["currentPhase"].startswith("Giai đoạn 3")
    loaded = (await client.get("/api/v1/config")).json()["data"]
    assert loaded["status"] == "hacking"
    assert loaded["end_time"] == saved["end_time"]
