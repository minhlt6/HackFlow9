from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import select, func

from app.core.config import Settings, DEFAULT_DEV_SECRET_KEY, settings
from app.models.checkpoint import Checkpoint
from app.models.config import HackathonConfig
from app.models.topic import Topic, Subtopic
from app.models.user import User
from app.core.security import hash_password, verify_password
from scripts.build_demo import demo_id
from tests.test_bug_46_51 import seed, headers


@pytest.mark.asyncio
async def test_c03_conflicting_phase_and_invalid_boolean_or_threshold_rejected(db_session, client):
    await seed(db_session)
    admin_hdr = await headers(db_session, "admin")

    # 1. Conflicting status and currentPhase must be rejected with 400
    r_conflict = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"status": "completed", "currentPhase": "Thực thi dự án & Nộp bài các chặng"},
    )
    assert r_conflict.status_code == 400, r_conflict.text
    assert r_conflict.json()["error_code"] == "CONFLICTING_PHASE_STATUS"

    # 2. String boolean ("false") must be rejected with 400, not coerced to True
    r_bool = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"blindJudgingEnabled": "false"},
    )
    assert r_bool.status_code == 400, r_bool.text
    assert r_bool.json()["error_code"] == "INVALID_BOOLEAN_FIELD"

    # 3. Invalid discrepancyThreshold must be rejected with 400
    r_thresh = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"discrepancyThreshold": 0},
    )
    assert r_thresh.status_code == 400, r_thresh.text
    assert r_thresh.json()["error_code"] == "INVALID_DISCREPANCY_THRESHOLD"

    # 4. Disabling submissionFreezeEnabled for final checkpoint must be rejected (C04)
    r_freeze = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"submissionFreezeEnabled": False},
    )
    assert r_freeze.status_code == 400, r_freeze.text
    assert r_freeze.json()["error_code"] == "SUBMISSION_FREEZE_REQUIRED"


@pytest.mark.asyncio
async def test_c01_c02_pause_and_phase_submission_policy_consistent_on_read_and_write(db_session, client):
    await seed(db_session)
    admin_hdr = await headers(db_session, "admin")
    leader_hdr = await headers(db_session, "cyber.leader")

    cp = (await db_session.execute(select(Checkpoint))).scalars().first()
    cp.start_time = datetime.now(timezone.utc) - timedelta(hours=1)
    cp.deadline = datetime.now(timezone.utc) + timedelta(hours=1)
    cp.is_active = True
    await db_session.commit()

    # 1. During 'judging', GET /checkpoints must return can_submit=False with submission_block_reason (C02)
    r_judging = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"status": "judging"},
    )
    assert r_judging.status_code == 200, r_judging.text
    assert r_judging.json()["data"]["isContestStarted"] is False
    assert r_judging.json()["data"]["contestState"] == "judging"

    r_cps = await client.get("/api/v1/checkpoints", headers=leader_hdr)
    assert r_cps.status_code == 200, r_cps.text
    data = r_cps.json()["data"]
    rows = data if isinstance(data, list) else data["checkpoints"]
    target_row = next(x for x in rows if x["id"] == cp.id)
    assert target_row["is_open"] is True
    assert target_row["can_submit"] is False
    assert target_row["contest_allows_submission"] is False
    assert target_row["submission_block_reason"]

    # 2. Switch back to 'hacking', then pause competition (is_paused=True) -> blocks submission & topic select while keeping phase='hacking' (C01)
    r_hack = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"status": "hacking", "is_paused": True, "pause_reason": "Bảo trì hệ thống khẩn cấp"},
    )
    assert r_hack.status_code == 200, r_hack.text
    cfg_data = r_hack.json()["data"]
    assert cfg_data["status"] == "hacking"
    assert cfg_data["is_paused"] is True
    assert cfg_data["contestState"] == "paused"
    assert cfg_data["isContestStarted"] is False

    # Checkpoints read shows can_submit=False with pause reason
    r_cps_paused = await client.get("/api/v1/checkpoints", headers=leader_hdr)
    rows_paused = r_cps_paused.json()["data"]
    cp_paused = next(x for x in rows_paused if x["id"] == cp.id)
    assert cp_paused["can_submit"] is False
    assert "tạm dừng" in cp_paused["submission_block_reason"].lower()

    # Submission write is blocked with CONTEST_PAUSED
    r_sub_paused = await client.post(
        "/api/v1/submissions",
        headers=leader_hdr,
        json={
            "checkpoint_id": cp.id,
            "repo_url": "https://github.com/cybersamurai/repo",
            "note": "Attempt while paused",
        },
    )
    assert r_sub_paused.status_code == 400, r_sub_paused.text
    assert r_sub_paused.json()["error_code"] == "CONTEST_PAUSED"

    # Resume competition -> can_submit becomes True again
    r_resume = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"is_paused": False},
    )
    assert r_resume.status_code == 200
    assert r_resume.json()["data"]["is_paused"] is False
    assert r_resume.json()["data"]["isContestStarted"] is True


@pytest.mark.asyncio
async def test_c04_registration_deadline_and_phase_enforced_on_register(db_session, client):
    await seed(db_session)
    cfg = await db_session.get(HackathonConfig, demo_id("config"))
    cfg.settings_data = {
        **cfg.settings_data,
        "status": "hacking",
        "registrationDeadline": "2020-01-01T00:00:00Z",
    }
    await db_session.commit()

    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "audit-new@example.org",
            "password": "123456",
            "full_name": "Audit Candidate",
            "role": "candidate",
        },
    )
    assert r.status_code == 409, r.text
    assert r.json()["error_code"] == "REGISTRATION_CLOSED"


@pytest.mark.asyncio
async def test_c05_bidirectional_schedule_and_single_final_checkpoint(db_session, client):
    await seed(db_session)
    admin_hdr = await headers(db_session, "admin")
    now = datetime.now(timezone.utc)

    # 1. Creating a second final checkpoint is rejected
    r_dup_final = await client.post(
        "/api/v1/checkpoints",
        headers=admin_hdr,
        json={
            "title": "Second Final CP",
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "deadline": (now + timedelta(days=6)).isoformat(),
            "is_final_checkpoint": True,
        },
    )
    assert r_dup_final.status_code == 400, r_dup_final.text

    # 2. Creating a progress checkpoint WITHOUT display_order but with deadline after Final Checkpoint is rejected
    r_late_prog = await client.post(
        "/api/v1/checkpoints",
        headers=admin_hdr,
        json={
            "title": "Late Progress CP without display_order",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "deadline": (now + timedelta(days=30)).isoformat(),
            "is_final_checkpoint": False,
        },
    )
    assert r_late_prog.status_code == 400, r_late_prog.text

    # 3. Setting config end_time earlier than Final Checkpoint start_time is rejected
    final_cp = (
        await db_session.execute(
            select(Checkpoint).where(Checkpoint.is_final_checkpoint.is_(True))
        )
    ).scalars().first()
    bad_end = ensure_utc_dt_helper(final_cp.start_time) - timedelta(minutes=5)
    r_bad_end = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"end_time": bad_end.isoformat()},
    )
    assert r_bad_end.status_code == 400, r_bad_end.text


def ensure_utc_dt_helper(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_c06_c07_c08_preview_impact_version_conflict_and_audit_history(db_session, client):
    await seed(db_session)
    admin_hdr = await headers(db_session, "admin")

    # 1. Preview impact when increasing minTeamMembers to 5 -> reports under_min_teams
    r_prev = await client.post(
        "/api/v1/admin/config/preview",
        headers=admin_hdr,
        json={"minTeamMembers": 5, "maxTeamMembers": 5, "status": "judging"},
    )
    assert r_prev.status_code == 200, r_prev.text
    prev_data = r_prev.json()["data"]
    assert prev_data["team_size_impact"]["under_min_count"] >= 1
    assert len(prev_data["warnings"]) >= 1

    # 2. Save config and verify version increments and configHistory records diff
    r_get = await client.get("/api/v1/admin/config", headers=admin_hdr)
    v1 = r_get.json()["data"]["version"]

    r_save = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={
            "expected_version": v1,
            "minTeamMembers": 4,
            "minTeamSize": 4,
            "reason": "Tăng quy mô tối thiểu đội thi",
        },
    )
    assert r_save.status_code == 200, r_save.text
    saved_data = r_save.json()["data"]
    assert saved_data["version"] == v1 + 1
    assert len(saved_data["configHistory"]) >= 1
    assert saved_data["configHistory"][-1]["reason"] == "Tăng quy mô tối thiểu đội thi"
    assert "minTeamSize" in saved_data["configHistory"][-1]["diff"]

    # 3. Saving again with stale expected_version=v1 returns 409 CONFIG_VERSION_CONFLICT
    r_stale = await client.patch(
        "/api/v1/admin/config",
        headers=admin_hdr,
        json={"expected_version": v1, "name": "Stale Overwrite Attempt"},
    )
    assert r_stale.status_code == 409, r_stale.text
    assert r_stale.json()["error_code"] == "CONFIG_VERSION_CONFLICT"


@pytest.mark.asyncio
async def test_c09_c10_c11_operational_safety_supabase_url_and_prod_validation(db_session, monkeypatch):
    # 1. C10: Supabase direct URL on Railway is NOT rewritten to SQLite
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    test_db_url = "postgresql://" + "user" + ":" + "pass" + "@db.abcdefgh.supabase.co:5432/postgres"
    s_supa = Settings(
        DATABASE_URL=test_db_url,
        ENVIRONMENT="production",
        DEBUG=False,
        ENABLE_DEMO_DATA=False,
        ENABLE_STARTUP_SEED=False,
        SECRET_KEY="x" * 36,
    )
    assert s_supa.async_database_url == test_db_url.replace("postgresql://", "postgresql+asyncpg://")
    assert s_supa.validate_production_readiness() == []

    # 2. C11: Production readiness catches default secret key, DEBUG=True, or ENABLE_STARTUP_SEED=True
    s_bad_prod = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        ENABLE_STARTUP_SEED=True,
        SECRET_KEY=DEFAULT_DEV_SECRET_KEY,
    )
    errors = s_bad_prod.validate_production_readiness()
    assert len(errors) >= 3
    with pytest.raises(RuntimeError):
        s_bad_prod.validate_production_config_or_raise()

    # 3. C09: _seed_default_accounts does NOT reset existing user passwords or inflate topic max_teams
    import app.core.database as db_module
    from app.main import _seed_default_accounts
    from tests.conftest import test_engine, TestSessionLocal

    await seed(db_session)
    admin_u = (
        await db_session.execute(select(User).where(User.email == "admin@demo.example.com"))
    ).scalar_one()
    custom_pw = "654321"
    admin_u.hashed_password = hash_password(custom_pw)

    top = (await db_session.execute(select(Topic))).scalars().first()
    orig_max = 1
    top.max_teams = orig_max
    await db_session.commit()

    monkeypatch.setattr(db_module, "engine", test_engine)
    monkeypatch.setattr(db_module, "AsyncSessionLocal", TestSessionLocal)
    monkeypatch.setattr(settings, "ENABLE_STARTUP_SEED", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    await _seed_default_accounts()

    await db_session.refresh(admin_u)
    await db_session.refresh(top)
    assert verify_password(custom_pw, admin_u.hashed_password) is True
    assert top.max_teams == orig_max
