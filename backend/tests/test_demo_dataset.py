from datetime import datetime, timezone

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import Base
from app.models.user import User
from scripts.build_demo import build_dataset, demo_id, write_database


@pytest.mark.asyncio
@pytest.mark.parametrize("stage", ["rehearsal", "results"])
async def test_demo_database_real_api_lifecycle(stage, db_session, client):
    rows, manifest = build_dataset(stage, datetime.now(timezone.utc), "Demo-test-2026!")
    for table in Base.metadata.sorted_tables:
        if rows[table.name]:
            await db_session.execute(table.insert(), rows[table.name])
    await db_session.commit()

    async def login(slug):
        response = await client.post("/api/v1/auth/login", json={
            "email": f"{slug}@demo.example.com", "password": "Demo-test-2026!"})
        assert response.status_code == 200, response.text
        return {"Authorization": "Bearer " + response.json()["data"]["access_token"]}

    admin = await login("admin")
    leader = await login("cyber.leader")
    judge = await login("judge1")
    mentor = await login("mentor1")
    for path, headers in [("/admin/config", admin), ("/admin/teams", admin), ("/teams/me", leader),
                          ("/topics", leader), ("/checkpoints", leader), ("/evaluations/submissions", judge),
                          ("/tickets", mentor), ("/announcements", leader)]:
        response = await client.get("/api/v1" + path, headers=headers)
        assert response.status_code == 200, (path, response.text)

    rubric = await client.get("/api/v1/rubrics", headers=judge)
    assert rubric.status_code == 200, rubric.text
    criteria = rubric.json()["data"]["criteria"]
    assert len(criteria) == 4
    if stage == "rehearsal":
        too_small = await client.delete("/api/v1/teams/members/" + manifest["teams"]["cyber"]["members"][1], headers=leader)
        assert too_small.status_code == 409, too_small.text
        green = await login("green.leader")
        removed = await client.delete("/api/v1/teams/members/" + manifest["teams"]["green"]["members"][1], headers=green)
        assert removed.status_code == 200, removed.text
        remaining = await client.get("/api/v1/teams/me", headers=green)
        assert len(remaining.json()["data"]["members"]) == 4
        explorer = await login("explore.leader")
        full = await client.post("/api/v1/topics/select", headers=explorer, json={"topic_id": demo_id("topic/2")})
        assert full.status_code == 409, full.text
        selected = await client.post("/api/v1/topics/select", headers=explorer, json={"topic_id": demo_id("topic/0"), "subtopic_id": demo_id("subtopic/0/1")})
        assert selected.status_code == 200, selected.text
        cancelled = await client.post("/api/v1/topics/cancel", headers=explorer, json={})
        assert cancelled.status_code == 200, cancelled.text
        expired = await client.patch("/api/v1/tickets/" + manifest["tickets"]["expired"], headers=leader, json={"action": "reopen"})
        assert expired.status_code == 409, expired.text
        recent = await client.patch("/api/v1/tickets/" + manifest["tickets"]["recent"], headers=leader, json={"action": "reopen"})
        assert recent.status_code == 200, recent.text
        foreign = await client.patch("/api/v1/tickets/" + manifest["tickets"]["other"], headers=mentor, json={"action": "resolve"})
        assert foreign.status_code == 403, foreign.text
        payload = {"submission_id": manifest["final_submissions"]["cyber"], "status": "draft",
                   "evaluations": [{"criteria_id": c["id"], "score": 8, "comment": "Demo"} for c in criteria]}
        draft = await client.post("/api/v1/evaluations", headers=judge, json=payload)
        assert draft.status_code in (200, 201), draft.text
        payload["status"] = "submitted"
        submitted = await client.post("/api/v1/evaluations", headers=judge, json=payload)
        assert submitted.status_code in (200, 201), submitted.text
    else:
        board = await client.get("/api/v1/leaderboard", headers=admin)
        assert board.status_code == 200, board.text
        entries = board.json()["data"]["leaderboard"]
        assert len(entries) == 4
        cyber = next(e for e in entries if e["team_name"] == "CyberSamurai")
        green = next(e for e in entries if e["team_name"] == "GreenPulse IoT")
        neural = next(e for e in entries if e["team_name"] == "NeuralCrafters")
        assert cyber["final_score"] == neural["final_score"] == 83
        assert cyber["rank"] < neural["rank"]
        assert green["has_discrepancy"] is True
    hidden = await client.get("/api/v1/leaderboard", headers=leader)
    assert hidden.status_code == 403
    publish = await client.patch("/api/v1/admin/leaderboard/publish", headers=admin, json={"is_result_published": True})
    assert publish.status_code == 200, publish.text
    visible = await client.get("/api/v1/leaderboard", headers=leader)
    assert visible.status_code == 200
    assert "judge_scores" not in visible.json()["data"]["leaderboard"][0]


@pytest.mark.asyncio
async def test_generator_foreign_keys_and_refuses_existing_records(tmp_path):
    rows, _ = build_dataset("results", datetime.now(timezone.utc), "Test!")
    url = "sqlite+aiosqlite:///" + (tmp_path / "demo.db").as_posix()
    await write_database(url, rows)
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            assert not (await conn.execute(text("PRAGMA foreign_key_check"))).all()
            before = await conn.scalar(select(func.count()).select_from(User))
        with pytest.raises(ValueError, match="not empty"):
            await write_database(url, rows)
        async with engine.connect() as conn:
            assert await conn.scalar(select(func.count()).select_from(User)) == before
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_disable_startup_seed_preserves_only_schema(monkeypatch):
    import app.core.database as database
    from app.core.config import settings
    from app.main import _seed_default_accounts
    from conftest import test_engine
    monkeypatch.setattr(database, "engine", test_engine)
    monkeypatch.setattr(settings, "ENABLE_STARTUP_SEED", False)
    await _seed_default_accounts()
    async with test_engine.connect() as conn:
        assert await conn.scalar(select(func.count()).select_from(User)) == 0
