from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import pytest
from app.core.config import settings
from app.models.checkpoint import Checkpoint
from app.services.github_service import github_service
from tests.conftest import TestSessionLocal
from tests.test_submissions import setup_team_and_users, make_mock_verify_response, SAMPLE_SHA_V1

@pytest.mark.asyncio
async def test_demo_tokens_rejected_when_disabled(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEMO_DATA", False)
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer mock-jwt-token-admin"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_demo_tokens_rejected_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEMO_DATA", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer mock-jwt-token-admin"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_final_requires_configured_checkpoint(client):
    async with TestSessionLocal() as session:
        team, tokens = await setup_team_and_users(session)
    response = await client.post("/api/v1/submissions/final", headers={"Authorization": f"Bearer {tokens['leader']}"}, json={"github_url": "https://github.com/alpha/hackflow"})
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_final_checks_role_deadline_and_real_sha(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEMO_DATA", False)
    async with TestSessionLocal() as session:
        team, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(title="Final", start_time=now-timedelta(hours=1), deadline=now+timedelta(hours=1), is_active=True, is_final_checkpoint=True)
        session.add(cp)
        await session.commit()
        cp_id = cp.id
    payload = {"github_url": "https://github.com/alpha/hackflow", "commit_sha": "fake-client-sha"}
    member = await client.post("/api/v1/submissions/final", headers={"Authorization": f"Bearer {tokens['member']}"}, json=payload)
    assert member.status_code == 403
    with patch.object(github_service, "fetch_head_commit", new=AsyncMock(return_value=make_mock_verify_response())):
        response = await client.post("/api/v1/submissions/final", headers={"Authorization": f"Bearer {tokens['leader']}"}, json=payload)
    assert response.status_code == 200
    assert response.json()["data"]["commit_sha"] == SAMPLE_SHA_V1
    async with TestSessionLocal() as session:
        cp = await session.get(Checkpoint, cp_id)
        cp.deadline = now-timedelta(minutes=1)
        await session.commit()
    late = await client.post("/api/v1/submissions/final", headers={"Authorization": f"Bearer {tokens['leader']}"}, json=payload)
    assert late.status_code == 400

@pytest.mark.asyncio
async def test_team_description_persists_and_member_cannot_edit(client):
    async with TestSessionLocal() as session:
        team, tokens = await setup_team_and_users(session)
    for role, expected in [("member", 403), ("leader", 200)]:
        response = await client.patch("/api/v1/teams/me", headers={"Authorization": f"Bearer {tokens[role]}"}, json={"description": "Real team description"})
        assert response.status_code == expected
    response = await client.get("/api/v1/teams/me", headers={"Authorization": f"Bearer {tokens['leader']}"})
    assert response.json()["data"]["description"] == "Real team description"

@pytest.mark.asyncio
async def test_public_config_matches_saved_admin_config(client):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
    response = await client.patch("/api/v1/admin/config", headers={"Authorization": f"Bearer {tokens['admin']}"}, json={"name": "Real competition", "maxTeamSize": 4, "blindJudgingEnabled": False})
    assert response.status_code == 200
    public = await client.get("/api/v1/config")
    assert public.json()["data"]["maxTeamSize"] == 4
    assert public.json()["data"]["blindJudgingEnabled"] is False


@pytest.mark.asyncio
async def test_candidate_chat_button_persists_messages_without_changing_privileges(client):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
    leader_headers = {"Authorization": f"Bearer {tokens['leader']}"}
    created = await client.post("/api/v1/tickets", headers=leader_headers, json={"title": "Need help with API", "content": "Please help with the API connection", "category": "technical", "priority": "normal"})
    assert created.status_code == 201
    ticket_id = created.json()["data"]["id"]
    reply = await client.patch(f"/api/v1/tickets/{ticket_id}", headers=leader_headers, json={"action": "update_response", "response": "Additional details", "assigned_to": "forged-assignee", "priority": "urgent"})
    assert reply.status_code == 200
    detail = await client.get(f"/api/v1/tickets/{ticket_id}", headers=leader_headers)
    data = detail.json()["data"]
    assert data["messages"][0]["content"] == "Additional details"
    assert data["messages"][0]["senderRole"] == "candidate"
    assert data["assigned_to"] is None
    assert data["priority"] == "normal"
    assert data["response"] is None
    outsider = await client.patch(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {tokens['outsider']}"}, json={"action": "update_response", "response": "Unauthorized reply"})
    assert outsider.status_code == 403
@pytest.mark.asyncio
async def test_announcement_audience_and_notification_receipts_persist(client):
    from app.models.user import User
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
    admin = {"Authorization": f"Bearer {tokens['admin']}"}
    candidate = {"Authorization": f"Bearer {tokens['leader']}"}
    created = await client.post("/api/v1/announcements", headers=admin, json={"title": "Judges only", "content": "Private judging instructions", "target_audience": "judge"})
    assert created.status_code == 201
    ann_id = created.json()["data"]["id"]
    listed = await client.get("/api/v1/announcements", headers=candidate)
    assert all(item["id"] != ann_id for item in listed.json()["data"]["items"])
    listed = await client.get("/api/v1/notifications/me", headers=candidate)
    assert all(item["id"] != ann_id for item in listed.json()["data"])
    denied = await client.patch(f"/api/v1/notifications/{ann_id}/read", headers=candidate)
    assert denied.status_code == 404
    await client.put(f"/api/v1/announcements/{ann_id}", headers=admin, json={"target_audience": "candidate"})
    marked = await client.post(f"/api/v1/notifications/{ann_id}/dismiss", headers=candidate)
    assert marked.status_code == 200
    listed = await client.get("/api/v1/notifications/me", headers=candidate)
    item = next(item for item in listed.json()["data"] if item["id"] == ann_id)
    assert item["is_read"] and item["is_dismissed"]
    from sqlalchemy import select
    async with TestSessionLocal() as session:
        users = (await session.execute(select(User))).scalars().all()
        assert any(ann_id in (user.notification_state or {}).get("dismissed", []) for user in users)
@pytest.mark.asyncio
async def test_checkpoint_buttons_persist_weight_and_order(client):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    now = datetime.now(timezone.utc)
    ids = []
    for title, order in [("First checkpoint", 1), ("Second checkpoint", 0)]:
        response = await client.post("/api/v1/checkpoints", headers=headers, json={"title": title, "start_time": now.isoformat(), "deadline": (now+timedelta(hours=1)).isoformat(), "weight": 35, "display_order": order})
        assert response.status_code in (200, 201)
        ids.append(response.json()["data"]["id"])
    updated = await client.put(f"/api/v1/checkpoints/{ids[0]}", headers=headers, json={"weight": 65, "display_order": 2})
    assert updated.status_code == 200
    assert updated.json()["data"]["weight"] == 65
    listing = await client.get("/api/v1/checkpoints", headers=headers)
    assert [cp["id"] for cp in listing.json()["data"]] == [ids[1], ids[0]]
