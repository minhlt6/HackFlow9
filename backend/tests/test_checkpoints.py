from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.security import create_access_token
from app.models.user import ApprovalStatus, User, UserRole
from app.api.deps import require_checkpoint_open_by_id
from tests.conftest import TestSessionLocal


async def create_test_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: str = UserRole.CANDIDATE.value,
    approval_status: str = ApprovalStatus.APPROVED.value,
) -> tuple[User, str]:
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        approval_status=approval_status,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(subject=str(user.id), claims={"role": user.role})
    return user, token


@pytest.mark.asyncio
async def test_list_checkpoints_empty(client: AsyncClient):
    """
    Test GET /api/v1/checkpoints returns empty list initially.
    """
    response = await client.get("/api/v1/checkpoints")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert isinstance(res["data"], list)


@pytest.mark.asyncio
async def test_admin_create_checkpoint_success(client: AsyncClient):
    """
    Test Admin creates a new Checkpoint successfully (201 Created).
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_cp@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    start_time = now + timedelta(minutes=10)
    deadline = now + timedelta(hours=2)

    payload = {
        "title": "Checkpoint 1 — Ý tưởng & Thiết kế kiến trúc",
        "description": "Nộp tài liệu kiến trúc hệ thống và link repository GitHub khởi tạo.",
        "start_time": start_time.isoformat(),
        "deadline": deadline.isoformat(),
        "requirements": "- Sơ đồ ERD\n- Kiến trúc 3 tầng\n- Repo GitHub public",
        "is_active": True,
    }

    response = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert response.status_code == 201
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["title"] == payload["title"]
    assert data["status"] == "upcoming"
    assert data["is_open"] is False
    assert data["can_submit"] is False
    assert data["grace_period_seconds"] == 5
    assert data["time_until_start_seconds"] > 0


@pytest.mark.asyncio
async def test_create_checkpoint_forbidden_for_candidate(client: AsyncClient):
    """
    Candidate cannot create a checkpoint (403 Forbidden).
    """
    async with TestSessionLocal() as session:
        _, candidate_token = await create_test_user(
            session, "candidate_cp@hackflow.dev", "Candidate User", role=UserRole.CANDIDATE.value
        )

    now = datetime.now(timezone.utc)
    payload = {
        "title": "Unauthorized Checkpoint",
        "start_time": now.isoformat(),
        "deadline": (now + timedelta(hours=1)).isoformat(),
    }
    response = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {candidate_token}"},
        json=payload,
    )
    assert response.status_code == 403
    res = response.json()
    assert res["success"] is False
    assert res["error_code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_create_checkpoint_deadline_before_start(client: AsyncClient):
    """
    Validation error if deadline is before or equal to start_time (422 Unprocessable).
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_cp2@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    payload = {
        "title": "Invalid Timing Checkpoint",
        "start_time": (now + timedelta(hours=2)).isoformat(),
        "deadline": (now + timedelta(hours=1)).isoformat(),  # Invalid: before start
    }
    response = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_checkpoint_time_gating_upcoming(client: AsyncClient):
    """
    Time-gating test: When server time < start_time -> Status is UPCOMING,
    and validating submission window returns 403 Forbidden with CHECKPOINT_NOT_OPEN.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_time1@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_time1@hackflow.dev", "User One"
        )

    now = datetime.now(timezone.utc)
    # Checkpoint starts in 30 minutes
    start_time = now + timedelta(minutes=30)
    deadline = now + timedelta(hours=2)

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Upcoming Milestone",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # 1. Check status endpoint
    status_res = await client.get(f"/api/v1/checkpoints/{cp_id}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()["data"]
    assert st_data["status"] == "upcoming"
    assert st_data["is_open"] is False
    assert st_data["can_submit"] is False
    assert st_data["time_until_start_seconds"] > 0

    # 2. Validate window -> Must raise 403 Forbidden (CHECKPOINT_NOT_OPEN)
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 403
    val_json = val_res.json()
    assert val_json["success"] is False
    assert val_json["error_code"] == "CHECKPOINT_NOT_OPEN"
    assert "chưa đến giờ mở" in val_json["message"]


@pytest.mark.asyncio
async def test_checkpoint_time_gating_open_normal(client: AsyncClient):
    """
    Time-gating test: When start_time <= now <= deadline -> Status is OPEN,
    and validating submission window returns 200 OK with grace_period_applied=False.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_time2@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_time2@hackflow.dev", "User Two"
        )

    now = datetime.now(timezone.utc)
    # Checkpoint opened 1 hour ago, closes in 1 hour
    start_time = now - timedelta(hours=1)
    deadline = now + timedelta(hours=1)

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Open Milestone",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # 1. Check status endpoint
    status_res = await client.get(f"/api/v1/checkpoints/{cp_id}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()["data"]
    assert st_data["status"] == "open"
    assert st_data["is_open"] is True
    assert st_data["can_submit"] is True
    assert st_data["grace_period_applied"] is False
    assert st_data["time_remaining_seconds"] > 0

    # 2. Validate window -> Must return 200 OK
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 200
    val_json = val_res.json()
    assert val_json["success"] is True
    assert val_json["data"]["is_valid"] is True
    assert val_json["data"]["grace_period_applied"] is False


@pytest.mark.asyncio
async def test_checkpoint_time_gating_grace_period(client: AsyncClient):
    """
    Time-gating test: When deadline < now <= deadline + 5s -> Status is GRACE_PERIOD,
    and validating submission window returns 200 OK with grace_period_applied=True.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_time3@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_time3@hackflow.dev", "User Three"
        )

    now = datetime.now(timezone.utc)
    # Deadline was 2 seconds ago (within the 5-second grace window)
    start_time = now - timedelta(hours=1)
    deadline = now - timedelta(seconds=2)

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Grace Period Milestone",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # 1. Check status endpoint
    status_res = await client.get(f"/api/v1/checkpoints/{cp_id}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()["data"]
    assert st_data["status"] == "grace_period"
    assert st_data["is_open"] is True
    assert st_data["can_submit"] is True
    assert st_data["grace_period_applied"] is True

    # 2. Validate window -> Must return 200 OK with grace_period_applied=True
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 200
    val_json = val_res.json()
    assert val_json["success"] is True
    assert val_json["data"]["is_valid"] is True
    assert val_json["data"]["grace_period_applied"] is True
    assert "ân hạn" in val_json["data"]["message"]


@pytest.mark.asyncio
async def test_checkpoint_time_gating_deadline_exceeded(client: AsyncClient):
    """
    Time-gating test: When now > deadline + 5s -> Status is CLOSED,
    and validating submission window raises 403 Forbidden with DEADLINE_EXCEEDED.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_time4@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_time4@hackflow.dev", "User Four"
        )

    now = datetime.now(timezone.utc)
    # Deadline was 10 seconds ago (exceeded the 5s grace window)
    start_time = now - timedelta(hours=1)
    deadline = now - timedelta(seconds=10)

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Expired Milestone",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # 1. Check status endpoint
    status_res = await client.get(f"/api/v1/checkpoints/{cp_id}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()["data"]
    assert st_data["status"] == "closed"
    assert st_data["is_open"] is False
    assert st_data["can_submit"] is False

    # 2. Validate window -> Must raise 403 Forbidden with DEADLINE_EXCEEDED
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 403
    val_json = val_res.json()
    assert val_json["success"] is False
    assert val_json["error_code"] == "DEADLINE_EXCEEDED"
    assert "quá thời hạn nộp bài" in val_json["message"]


@pytest.mark.asyncio
async def test_checkpoint_time_gating_inactive_by_admin(client: AsyncClient):
    """
    Time-gating test: When is_active=False -> Status is CLOSED,
    and validating submission window raises 403 Forbidden with CHECKPOINT_INACTIVE.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_time5@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_time5@hackflow.dev", "User Five"
        )

    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=1)
    deadline = now + timedelta(hours=1)

    # Created with is_active = False
    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Inactive Milestone",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
            "is_active": False,
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # 1. Check status
    status_res = await client.get(f"/api/v1/checkpoints/{cp_id}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()["data"]
    assert st_data["is_active"] is False
    assert st_data["can_submit"] is False
    assert st_data["status"] == "closed"

    # 2. Validate window -> 403 Forbidden with CHECKPOINT_INACTIVE
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 403
    val_json = val_res.json()
    assert val_json["success"] is False
    assert val_json["error_code"] == "CHECKPOINT_INACTIVE"


@pytest.mark.asyncio
async def test_admin_update_checkpoint(client: AsyncClient):
    """
    Test Admin updates checkpoint title and extends deadline.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_update@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Original Title",
            "start_time": now.isoformat(),
            "deadline": (now + timedelta(hours=1)).isoformat(),
        },
    )
    cp_id = create_res.json()["data"]["id"]

    new_deadline = now + timedelta(hours=3)
    update_res = await client.put(
        f"/api/v1/checkpoints/{cp_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Updated Title Extension",
            "deadline": new_deadline.isoformat(),
        },
    )
    assert update_res.status_code == 200
    up_data = update_res.json()["data"]
    assert up_data["title"] == "Updated Title Extension"


@pytest.mark.asyncio
async def test_admin_toggle_active(client: AsyncClient):
    """
    Test Admin toggles is_active flag via PATCH /toggle-active.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_toggle@hackflow.dev", "Admin User", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Toggle Milestone",
            "start_time": now.isoformat(),
            "deadline": (now + timedelta(hours=1)).isoformat(),
            "is_active": True,
        },
    )
    cp_id = create_res.json()["data"]["id"]

    # Toggle off
    toggle_res = await client.patch(
        f"/api/v1/checkpoints/{cp_id}/toggle-active",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["data"]["is_active"] is False

    # Toggle on
    toggle_res2 = await client.patch(
        f"/api/v1/checkpoints/{cp_id}/toggle-active",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": True},
    )
    assert toggle_res2.status_code == 200
    assert toggle_res2.json()["data"]["is_active"] is True


@pytest.mark.asyncio
async def test_dependency_require_checkpoint_open():
    """
    Unit test for the FastAPI dependency 'require_checkpoint_open_by_id'.
    """
    async with TestSessionLocal() as session:
        now = datetime.now(timezone.utc)
        # 1. Create open checkpoint
        from app.repositories.checkpoint_repo import checkpoint_repo

        open_cp = await checkpoint_repo.create(
            db=session,
            title="Open Dep Checkpoint",
            start_time=now - timedelta(minutes=10),
            deadline=now + timedelta(minutes=10),
        )
        await session.commit()
        await session.refresh(open_cp)

        cp, grace = await require_checkpoint_open_by_id(str(open_cp.id), db=session)
        assert cp.id == open_cp.id
        assert grace is False

        # 2. Create expired checkpoint
        expired_cp = await checkpoint_repo.create(
            db=session,
            title="Expired Dep Checkpoint",
            start_time=now - timedelta(minutes=20),
            deadline=now - timedelta(minutes=10),
        )
        await session.commit()
        await session.refresh(expired_cp)

        with pytest.raises(ForbiddenException) as exc_info:
            await require_checkpoint_open_by_id(str(expired_cp.id), db=session)
        assert exc_info.value.error_code == "DEADLINE_EXCEEDED"

        # 3. Non-existent ID raises NotFoundException
        with pytest.raises(NotFoundException):
            await require_checkpoint_open_by_id("00000000-0000-0000-0000-000000000000", db=session)


@pytest.mark.asyncio
async def test_checkpoint_custom_grace_period(client: AsyncClient):
    """
    SRS HF-23: Test custom configurable grace_period_seconds (e.g. 20s).
    A submission 10s after deadline is valid under 20s grace period.
    A submission 25s after deadline is rejected (DEADLINE_EXCEEDED).
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_grace@hackflow.dev", "Admin Grace", role=UserRole.ADMIN.value
        )
        _, user_token = await create_test_user(
            session, "user_grace@hackflow.dev", "User Grace"
        )

    now = datetime.now(timezone.utc)
    # Checkpoint with deadline 10s ago, but grace_period_seconds = 20s
    start_time = now - timedelta(hours=1)
    deadline = now - timedelta(seconds=10)

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Custom 20s Grace Period Checkpoint",
            "start_time": start_time.isoformat(),
            "deadline": deadline.isoformat(),
            "grace_period_seconds": 20,
            "is_final_checkpoint": True,
        },
    )
    assert create_res.status_code == 201
    cp_data = create_res.json()["data"]
    assert cp_data["grace_period_seconds"] == 20
    assert cp_data["is_final_checkpoint"] is True
    assert cp_data["status"] == "grace_period"
    assert cp_data["can_submit"] is True

    # Validate window returns 200 OK with grace_period_applied=True
    val_res = await client.post(
        f"/api/v1/checkpoints/{cp_data['id']}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert val_res.status_code == 200
    assert val_res.json()["data"]["grace_period_applied"] is True

    # Simulate 25s after deadline -> Should be rejected
    val_late_res = await client.post(
        f"/api/v1/checkpoints/{cp_data['id']}/validate-window",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"simulate_time": (deadline + timedelta(seconds=25)).isoformat()},
    )
    assert val_late_res.status_code == 403
    assert val_late_res.json()["error_code"] == "DEADLINE_EXCEEDED"


@pytest.mark.asyncio
async def test_checkpoint_dynamic_submission_fields(client: AsyncClient):
    """
    SRS HF-23: Test Admin configures dynamic submission_fields and updates them.
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_fields@hackflow.dev", "Admin Fields", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    fields = [
        {
            "field_key": "repo_url",
            "field_label": "GitHub Repository URL",
            "required": True,
            "apply_sha_freeze": True,
        },
        {
            "field_key": "presentation_pdf",
            "field_label": "Slide báo cáo (PDF)",
            "required": False,
            "apply_sha_freeze": False,
        },
    ]

    create_res = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Final Checkpoint with Dynamic Fields",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "deadline": (now + timedelta(hours=5)).isoformat(),
            "is_final_checkpoint": True,
            "grace_period_seconds": 10,
            "submission_fields": fields,
        },
    )
    assert create_res.status_code == 201
    cp_data = create_res.json()["data"]
    assert cp_data["is_final_checkpoint"] is True
    assert cp_data["grace_period_seconds"] == 10
    assert len(cp_data["submission_fields"]) == 2
    assert cp_data["submission_fields"][0]["field_key"] == "repo_url"
    assert cp_data["submission_fields"][0]["apply_sha_freeze"] is True

    # Test update submission_fields
    updated_fields = [
        {
            "field_key": "demo_video",
            "field_label": "Video Demo Youtube",
            "required": True,
            "apply_sha_freeze": False,
        }
    ]
    update_res = await client.put(
        f"/api/v1/checkpoints/{cp_data['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"submission_fields": updated_fields},
    )
    assert update_res.status_code == 200
    assert len(update_res.json()["data"]["submission_fields"]) == 1
    assert update_res.json()["data"]["submission_fields"][0]["field_key"] == "demo_video"


@pytest.mark.asyncio
async def test_checkpoint_grace_period_validation_bounds(client: AsyncClient):
    """
    Validation error if grace_period_seconds is out of range [0, 300].
    """
    async with TestSessionLocal() as session:
        _, admin_token = await create_test_user(
            session, "admin_bounds@hackflow.dev", "Admin Bounds", role=UserRole.ADMIN.value
        )

    now = datetime.now(timezone.utc)
    # Negative grace period
    res_neg = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Invalid Negative Grace",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "deadline": (now + timedelta(hours=2)).isoformat(),
            "grace_period_seconds": -1,
        },
    )
    assert res_neg.status_code == 422

    # Exceeding max 300s
    res_max = await client.post(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Invalid Large Grace",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "deadline": (now + timedelta(hours=2)).isoformat(),
            "grace_period_seconds": 301,
        },
    )
    assert res_max.status_code == 422

