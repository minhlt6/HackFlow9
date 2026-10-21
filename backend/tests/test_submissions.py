from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.checkpoint import AuditLog, Checkpoint, Submission, SubmissionStatus
from app.models.team import Team, TeamMember, TeamMemberRole
from app.models.user import ApprovalStatus, User, UserRole
from app.schemas.github import VerifyGitHubRepoResponse
from app.services.github_service import github_service
from tests.conftest import TestSessionLocal

SAMPLE_SHA_V1 = "1111111111111111111111111111111111111111"
SAMPLE_SHA_V2 = "2222222222222222222222222222222222222222"


async def setup_team_and_users(db: AsyncSession):
    """
    Creates:
    - Admin user
    - Team Leader (APPROVED)
    - Team Member (APPROVED)
    - Pending Leader (PENDING)
    - Outsider Candidate (APPROVED, no team)
    - Team linking Leader & Member
    """
    admin = User(
        email="admin_sub@hackflow.dev",
        full_name="BTC Admin",
        role=UserRole.ADMIN.value,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    leader = User(
        email="leader_sub@hackflow.dev",
        full_name="Team Leader",
        role=UserRole.CANDIDATE.value,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    member = User(
        email="member_sub@hackflow.dev",
        full_name="Team Member",
        role=UserRole.CANDIDATE.value,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    pending_user = User(
        email="pending_sub@hackflow.dev",
        full_name="Pending User",
        role=UserRole.CANDIDATE.value,
        approval_status=ApprovalStatus.PENDING.value,
        is_active=True,
    )
    outsider = User(
        email="outsider_sub@hackflow.dev",
        full_name="No Team User",
        role=UserRole.CANDIDATE.value,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    db.add_all([admin, leader, member, pending_user, outsider])
    await db.flush()

    team = Team(
        team_name="AlphaSubmitters",
        invite_code="SUB123",
        is_locked=False,
    )
    pending_team = Team(
        team_name="PendingTeam",
        invite_code="PND123",
        is_locked=False,
    )
    db.add_all([team, pending_team])
    await db.flush()

    db.add_all(
        [
            TeamMember(team_id=team.id, user_id=leader.id, role=TeamMemberRole.LEADER.value),
            TeamMember(team_id=team.id, user_id=member.id, role=TeamMemberRole.MEMBER.value),
            TeamMember(
                team_id=pending_team.id,
                user_id=pending_user.id,
                role=TeamMemberRole.LEADER.value,
            ),
        ]
    )
    await db.commit()
    for obj in (admin, leader, member, pending_user, outsider, team):
        await db.refresh(obj)

    tokens = {
        "admin": create_access_token(subject=str(admin.id), claims={"role": admin.role}),
        "leader": create_access_token(subject=str(leader.id), claims={"role": leader.role}),
        "member": create_access_token(subject=str(member.id), claims={"role": member.role}),
        "pending": create_access_token(
            subject=str(pending_user.id), claims={"role": pending_user.role}
        ),
        "outsider": create_access_token(
            subject=str(outsider.id), claims={"role": outsider.role}
        ),
    }
    return team, tokens


def make_mock_verify_response(sha: str = SAMPLE_SHA_V1, repo_url: str = "https://github.com/alpha/hackflow"):
    return VerifyGitHubRepoResponse(
        repo_url=repo_url,
        owner="alpha",
        repo="hackflow",
        branch="main",
        commit_sha=sha,
        commit_message="feat: complete final MVP",
        author="Team Leader",
        committed_at=datetime.now(timezone.utc),
        html_url=f"{repo_url}/commit/{sha}",
        status=SubmissionStatus.SUBMITTED.value,
        error_code=None,
        retry_attempts=1,
        is_verified=True,
        is_fallback=False,
        message=f"Xác thực commit HEAD thành công: {sha[:7]}",
    )


# ─── UAT-CP-01 & UAT-FIX-08: Nộp bài thành công trước deadline (Checkpoint cuối) ───

@pytest.mark.asyncio
async def test_uat_cp_01_submit_final_checkpoint_success_with_sha_freeze(client: AsyncClient):
    async with TestSessionLocal() as session:
        team, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Checkpoint 3: Final MVP",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=True,
            grace_period_seconds=5,
            submission_fields=[
                {
                    "field_key": "repo_url",
                    "field_label": "GitHub Repository URL",
                    "required": True,
                    "apply_sha_freeze": True,
                },
                {
                    "field_key": "demo_url",
                    "field_label": "Live Demo URL",
                    "required": False,
                    "apply_sha_freeze": False,
                },
            ],
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=make_mock_verify_response(SAMPLE_SHA_V1)),
    ) as mock_gh:
        res = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {
                    "repo_url": "https://github.com/alpha/hackflow.git",
                    "demo_url": "https://alpha-demo.vercel.app",
                },
                "note": "Bản nộp MVP hoàn chỉnh",
            },
        )

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert data["checkpoint_id"] == cp_id
    assert data["team_id"] == str(team.id)
    assert data["status"] == "submitted"
    assert data["commit_sha"] == SAMPLE_SHA_V1
    assert data["repo_url"] == "https://github.com/alpha/hackflow"
    assert data["grace_period_applied"] is False
    assert data["version"] == 1
    assert mock_gh.await_count == 1

    # Kiểm tra bản ghi Audit Log trong DB
    async with TestSessionLocal() as session:
        logs = (await session.execute(select(AuditLog).where(AuditLog.checkpoint_id == cp_id))).scalars().all()
        assert len(logs) == 1
        assert logs[0].action == "SUBMISSION_CREATED"
        assert logs[0].late_grace_period is False
        assert logs[0].commit_sha == SAMPLE_SHA_V1


# ─── UAT-CP-02 & UAT-FIX-01: Chặn thành viên thường nộp bài (403 FORBIDDEN_NOT_TEAM_LEADER) ───

@pytest.mark.asyncio
async def test_uat_cp_02_forbidden_not_team_leader(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Checkpoint Open",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=False,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # 1. Thành viên thường (MEMBER) gọi nộp bài -> 403 FORBIDDEN_NOT_TEAM_LEADER
    res_member = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['member']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://figma.com/file/123"},
        },
    )
    assert res_member.status_code == 403
    assert res_member.json()["error_code"] == "FORBIDDEN_NOT_TEAM_LEADER"

    # 2. Thí sinh chưa thuộc đội nào gọi nộp bài -> 403 FORBIDDEN_NOT_TEAM_LEADER
    res_outsider = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['outsider']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://figma.com/file/123"},
        },
    )
    assert res_outsider.status_code == 403
    assert res_outsider.json()["error_code"] == "FORBIDDEN_NOT_TEAM_LEADER"


# ─── UAT-CP-03 & UAT-FIX-02: Checkpoint trung gian không freeze SHA & validate field động ───

@pytest.mark.asyncio
async def test_uat_cp_03_intermediate_checkpoint_no_sha_freeze_and_dynamic_fields(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Checkpoint 1: Ideation & Slide",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=False,
            submission_fields=[
                {
                    "field_key": "slide_url",
                    "field_label": "Link Slide thuyết trình",
                    "required": True,
                    "apply_sha_freeze": False,
                },
                {
                    "field_key": "progress_note",
                    "field_label": "Ghi chú tiến độ",
                    "required": False,
                    "apply_sha_freeze": False,
                },
            ],
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # 1. Nộp thiếu trường bắt buộc slide_url -> 422 MISSING_REQUIRED_FIELD
    res_missing = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"progress_note": "Đã xong phần phân tích BA"},
        },
    )
    assert res_missing.status_code == 422
    assert res_missing.json()["error_code"] == "MISSING_REQUIRED_FIELD"

    # 2. Nộp đủ slide_url -> 200 OK, status='submitted', commit_sha=None, KHÔNG gọi GitHub API
    with patch.object(github_service, "fetch_head_commit", new=AsyncMock()) as mock_gh:
        res_ok = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {
                    "slide_url": "https://docs.google.com/presentation/d/123",
                    "progress_note": "Hoàn thành 100% slide",
                },
            },
        )
        assert res_ok.status_code == 200
        data = res_ok.json()["data"]
        assert data["status"] == "submitted"
        assert data["commit_sha"] is None
        assert data["submission_data"]["slide_url"] == "https://docs.google.com/presentation/d/123"
        mock_gh.assert_not_awaited()


# ─── UAT-CP-04 & UAT-FIX-03: Nộp lại trước deadline, PENDING_SHA_FREEZE & Unique Constraint ───

@pytest.mark.asyncio
async def test_uat_cp_04_resubmission_before_deadline_and_version_history(client: AsyncClient):
    async with TestSessionLocal() as session:
        team, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Checkpoint Final Resubmission",
            start_time=now - timedelta(hours=2),
            deadline=now + timedelta(hours=2),
            is_active=True,
            is_final_checkpoint=True,
            grace_period_seconds=5,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    t1 = now - timedelta(minutes=30)
    t2 = now - timedelta(minutes=10)

    # Lần nộp 1 (v1) tại t1
    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=make_mock_verify_response(SAMPLE_SHA_V1)),
    ):
        res1 = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "note": "Phiên bản v1",
                "simulate_time": t1.isoformat(),
            },
        )
    assert res1.status_code == 200
    sub1 = res1.json()["data"]
    assert sub1["version"] == 1
    assert sub1["commit_sha"] == SAMPLE_SHA_V1

    # Lần nộp 2 (v2) tại t2 (cách 20 phút > 10s, ghi đè bản ghi cũ và lưu version_history)
    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=make_mock_verify_response(SAMPLE_SHA_V2)),
    ):
        res2 = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "note": "Phiên bản v2 cập nhật tính năng",
                "simulate_time": t2.isoformat(),
            },
        )
    assert res2.status_code == 200
    sub2 = res2.json()["data"]
    assert sub2["id"] == sub1["id"]  # Cùng 1 bản ghi chính thức nhờ Unique (team_id, checkpoint_id)
    assert sub2["version"] == 2
    assert sub2["commit_sha"] == SAMPLE_SHA_V2
    assert len(sub2["version_history"]) == 1
    assert sub2["version_history"][0]["version"] == 1
    assert sub2["version_history"][0]["commit_sha"] == SAMPLE_SHA_V1

    # Kiểm tra trong DB chỉ có đúng 1 dòng trong bảng submissions cho (team_id, checkpoint_id)
    async with TestSessionLocal() as session:
        count = await session.scalar(
            select(func.count(Submission.id)).where(
                Submission.team_id == str(team.id),
                Submission.checkpoint_id == cp_id,
            )
        )
        assert count == 1

    # Kiểm tra GET /api/v1/submissions trả về đầy đủ 2 phiên bản (v2 mới nhất và v1 lịch sử) cho bảng HF-31
    list_res = await client.get(
        f"/api/v1/submissions?checkpoint_id={cp_id}",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()["data"]
    assert len(items) == 2
    assert items[0]["version"] == 2
    assert items[0]["commit_sha"] == SAMPLE_SHA_V2
    assert items[1]["version"] == 1
    assert items[1]["commit_sha"] == SAMPLE_SHA_V1


# ─── UAT-CP-05 & UAT-FIX-04: Xử lý Grace Period linh hoạt & cờ late_grace_period trong Audit Log ───

@pytest.mark.asyncio
async def test_uat_cp_05_grace_period_submission_and_audit_log(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        deadline = now
        cp = Checkpoint(
            title="Grace Period 10s Checkpoint",
            start_time=now - timedelta(hours=1),
            deadline=deadline,
            is_active=True,
            is_final_checkpoint=False,
            grace_period_seconds=10,
            submission_fields=[
                {
                    "field_key": "demo_url",
                    "field_label": "Demo Link",
                    "required": True,
                    "apply_sha_freeze": False,
                }
            ],
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # Nộp trễ 8 giây so với deadline (nằm trong grace_period_seconds = 10s)
    late_8s = deadline + timedelta(seconds=8)
    res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://demo.hackflow.dev"},
            "simulate_time": late_8s.isoformat(),
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "submitted"
    assert data["grace_period_applied"] is True
    assert data["late_grace_period"] is True

    # Kiểm tra Audit Log gắn cờ late_grace_period = True
    audit_res = await client.get(
        f"/api/v1/submissions/audit-logs?checkpoint_id={cp_id}&late_grace_period=true",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert len(logs) == 1
    assert logs[0]["late_grace_period"] is True


# ─── UAT-CP-06 & UAT-FIX-05: Chặn quá hạn tuyệt đối & kiểm thử trễ 1s (400 DEADLINE_EXCEEDED) ───

@pytest.mark.asyncio
async def test_uat_cp_06_deadline_exceeded_by_1_second(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        deadline = now
        cp = Checkpoint(
            title="Zero Grace Period Checkpoint",
            start_time=now - timedelta(hours=1),
            deadline=deadline,
            is_active=True,
            is_final_checkpoint=False,
            grace_period_seconds=0,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # Nộp tại deadline + 1 giây khi grace_period_seconds = 0 -> 400 DEADLINE_EXCEEDED
    res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://demo.hackflow.dev"},
            "simulate_time": (deadline + timedelta(seconds=1)).isoformat(),
        },
    )
    assert res.status_code == 400
    assert res.json()["error_code"] == "DEADLINE_EXCEEDED"


# ─── UAT-CP-07 & UAT-FIX-06: Xử lý Repo Private/Inaccessible & Tự động Rollback an toàn ───

@pytest.mark.asyncio
async def test_uat_cp_07_private_repo_error_and_automatic_rollback_on_resubmission(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Final Checkpoint Rollback Test",
            start_time=now - timedelta(hours=2),
            deadline=now + timedelta(hours=2),
            is_active=True,
            is_final_checkpoint=True,
            grace_period_seconds=5,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    t1 = now - timedelta(minutes=25)
    t2 = now - timedelta(minutes=5)

    # Bước 1: Đội trưởng nộp bài v1 hợp lệ thành công
    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=make_mock_verify_response(SAMPLE_SHA_V1)),
    ):
        res1 = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "note": "Bản nộp hợp lệ v1",
                "simulate_time": t1.isoformat(),
            },
        )
    assert res1.status_code == 200
    assert res1.json()["data"]["commit_sha"] == SAMPLE_SHA_V1

    # Bước 2: Đội trưởng nộp lại (v2) nhưng đổi sang Repo Private -> GitHub trả 422 GITHUB_REPO_INACCESSIBLE
    from app.core.exceptions import UnprocessableEntityException

    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(
            side_effect=UnprocessableEntityException(
                message="Repository đang ở chế độ Private.",
                error_code="GITHUB_REPO_INACCESSIBLE",
            )
        ),
    ):
        res2 = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/private-repo"},
                "note": "Bản nộp lỗi repo private",
                "simulate_time": t2.isoformat(),
            },
        )

    assert res2.status_code == 422
    err_json = res2.json()
    assert err_json["error_code"] == "GITHUB_REPO_INACCESSIBLE"
    assert err_json["data"]["rolled_back"] is True
    assert err_json["data"]["preserved_commit_sha"] == SAMPLE_SHA_V1

    # Bước 3: Kiểm tra bản ghi bài nộp của đội vẫn giữ nguyên phiên bản v1 SUBMITTED hợp lệ
    list_res = await client.get(
        f"/api/v1/submissions?checkpoint_id={cp_id}",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
    )
    assert list_res.status_code == 200
    subs = list_res.json()["data"]
    assert len(subs) == 1
    assert subs[0]["status"] == "submitted"
    assert subs[0]["commit_sha"] == SAMPLE_SHA_V1
    assert subs[0]["repo_url"] == "https://github.com/alpha/hackflow"
    assert subs[0]["version"] == 1


# ─── UAT-CP-08 & UAT-FIX-07: Sự cố GitHub API sau 3 lần retry (200 OK sha_verification_failed) ───

@pytest.mark.asyncio
async def test_uat_cp_08_github_api_503_graceful_fallback(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Final Checkpoint GitHub Outage",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=True,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    fallback_verify = VerifyGitHubRepoResponse(
        repo_url="https://github.com/alpha/hackflow",
        owner="alpha",
        repo="hackflow",
        branch=None,
        commit_sha=None,
        status=SubmissionStatus.SHA_VERIFICATION_FAILED.value,
        error_code="GITHUB_API_UNAVAILABLE",
        retry_attempts=3,
        is_verified=False,
        is_fallback=True,
        message="GitHub API 503 sau 3 lần retry.",
    )

    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=fallback_verify),
    ):
        res = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
            },
        )

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["status"] == "sha_verification_failed"
    assert body["data"]["commit_sha"] is None
    assert "BTC sẽ xác thực thủ công" in body["message"]


# ─── UAT-CP-09: Chống trùng lặp & Cửa sổ Idempotency (10s & Idempotency-Key) ───

@pytest.mark.asyncio
async def test_uat_cp_09_idempotency_key_and_10s_duplicate_detection(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Final Checkpoint Idempotency",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=True,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    with patch.object(
        github_service,
        "fetch_head_commit",
        new=AsyncMock(return_value=make_mock_verify_response(SAMPLE_SHA_V1)),
    ) as mock_gh:
        # 1. Gửi lần đầu với Idempotency-Key
        res1 = await client.post(
            "/api/v1/submissions",
            headers={
                "Authorization": f"Bearer {tokens['leader']}",
                "Idempotency-Key": "idem-uuid-001",
            },
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "simulate_time": now.isoformat(),
            },
        )
        assert res1.status_code == 200
        assert res1.json()["data"]["is_duplicate"] is False
        assert mock_gh.await_count == 1

        # 2. Gửi lại cùng Idempotency-Key -> trả về bản ghi hiện tại, KHÔNG gọi lại GitHub API
        res2 = await client.post(
            "/api/v1/submissions",
            headers={
                "Authorization": f"Bearer {tokens['leader']}",
                "Idempotency-Key": "idem-uuid-001",
            },
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "simulate_time": (now + timedelta(seconds=30)).isoformat(),
            },
        )
        assert res2.status_code == 200
        assert res2.json()["data"]["is_duplicate"] is True
        assert res2.json()["data"]["version"] == 1
        assert mock_gh.await_count == 1

        # 3. Gửi lại cùng payload trong cửa sổ < 10s (vd: sau 4s) không truyền Idempotency-Key -> vẫn chặn duplicate
        res3 = await client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {tokens['leader']}"},
            json={
                "checkpoint_id": cp_id,
                "submission_data": {"repo_url": "https://github.com/alpha/hackflow"},
                "simulate_time": (now + timedelta(seconds=4)).isoformat(),
            },
        )
        assert res3.status_code == 200
        assert res3.json()["data"]["is_duplicate"] is True
        assert res3.json()["data"]["version"] == 1
        assert mock_gh.await_count == 1


# ─── UAT-CP-10: Nộp bài khi Checkpoint chưa mở (UPCOMING) hoặc inactive (400 INVALID_CHECKPOINT_STATUS) ───

@pytest.mark.asyncio
async def test_uat_cp_10_invalid_checkpoint_status_upcoming_or_inactive(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        upcoming_cp = Checkpoint(
            title="Upcoming Checkpoint",
            start_time=now + timedelta(hours=1),
            deadline=now + timedelta(hours=3),
            is_active=True,
            is_final_checkpoint=False,
        )
        inactive_cp = Checkpoint(
            title="Inactive Checkpoint",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=False,
            is_final_checkpoint=False,
        )
        session.add_all([upcoming_cp, inactive_cp])
        await session.commit()
        await session.refresh(upcoming_cp)
        await session.refresh(inactive_cp)
        up_id = str(upcoming_cp.id)
        in_id = str(inactive_cp.id)

    res_up = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": up_id,
            "submission_data": {"demo_url": "https://demo.app"},
        },
    )
    assert res_up.status_code == 400
    assert res_up.json()["error_code"] == "INVALID_CHECKPOINT_STATUS"

    res_in = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": in_id,
            "submission_data": {"demo_url": "https://demo.app"},
        },
    )
    assert res_in.status_code == 400
    assert res_in.json()["error_code"] == "INVALID_CHECKPOINT_STATUS"


# ─── UAT-CP-11: Chặn tài khoản chưa duyệt nộp bài (403 ACCOUNT_NOT_APPROVED) ───

@pytest.mark.asyncio
async def test_uat_cp_11_account_not_approved_forbidden(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Open Checkpoint",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=False,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['pending']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://demo.app"},
        },
    )
    assert res.status_code == 403
    assert res.json()["error_code"] == "ACCOUNT_NOT_APPROVED"


# ─── UAT-CP-12: Kiểm tra URL GitHub sai định dạng hoặc Repo rỗng (422 INVALID_GITHUB_URL / GITHUB_REPO_EMPTY) ───

@pytest.mark.asyncio
async def test_uat_cp_12_invalid_github_url_and_empty_repo(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Final Checkpoint URL Validation",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=True,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # 1. URL không phải GitHub -> 422 INVALID_GITHUB_URL
    res_bad_url = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"repo_url": "https://gitlab.com/alpha/hackflow"},
        },
    )
    assert res_bad_url.status_code == 422
    assert res_bad_url.json()["error_code"] == "INVALID_GITHUB_URL"

    # 2. Đảm bảo không còn bản ghi rác PENDING_SHA_FREEZE trong DB sau khi lần nộp đầu thất bại
    async with TestSessionLocal() as session:
        count = await session.scalar(
            select(func.count(Submission.id)).where(Submission.checkpoint_id == cp_id)
        )
        assert count == 0


# ─── UAT-CP-13: Gia hạn thủ công từ Admin & Đội trưởng nộp lại kèm Audit Log ───

@pytest.mark.asyncio
async def test_uat_cp_13_admin_extends_deadline_and_team_submits_with_audit_logs(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Expired Checkpoint to Extend",
            start_time=now - timedelta(hours=3),
            deadline=now - timedelta(minutes=15),
            is_active=True,
            is_final_checkpoint=False,
            grace_period_seconds=5,
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # 1. Đội trưởng nộp khi đã quá hạn -> 400 DEADLINE_EXCEEDED
    res_expired = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://demo.hackflow.dev"},
        },
    )
    assert res_expired.status_code == 400
    assert res_expired.json()["error_code"] == "DEADLINE_EXCEEDED"

    # 2. Admin gia hạn deadline thêm 2 giờ
    new_deadline = now + timedelta(hours=2)
    ext_res = await client.put(
        f"/api/v1/checkpoints/{cp_id}",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"deadline": new_deadline.isoformat()},
    )
    assert ext_res.status_code == 200

    # 3. Đội trưởng nộp bài thành công sau khi được gia hạn
    res_ok = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "checkpoint_id": cp_id,
            "submission_data": {"demo_url": "https://demo.hackflow.dev/v2"},
        },
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["data"]["status"] == "submitted"

    # 4. Admin truy vấn Audit Log thấy cả CHECKPOINT_DEADLINE_EXTENDED và SUBMISSION_CREATED
    logs_res = await client.get(
        f"/api/v1/submissions/audit-logs?checkpoint_id={cp_id}",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert logs_res.status_code == 200
    actions = [item["action"] for item in logs_res.json()["data"]]
    assert "CHECKPOINT_DEADLINE_EXTENDED" in actions
    assert "SUBMISSION_CREATED" in actions


# ─── Tương thích Frontend HF-30 / HF-31: POST /checkpoints/{id}/submissions & GET /checkpoints ───

@pytest.mark.asyncio
async def test_frontend_compat_checkpoint_submissions_and_latest_submission(client: AsyncClient):
    async with TestSessionLocal() as session:
        _, tokens = await setup_team_and_users(session)
        now = datetime.now(timezone.utc)
        cp = Checkpoint(
            title="Frontend Compat Checkpoint",
            start_time=now - timedelta(hours=1),
            deadline=now + timedelta(hours=1),
            is_active=True,
            is_final_checkpoint=False,
            submission_fields=[
                {
                    "field_key": "demo_url",
                    "field_label": "Link Prototype",
                    "required": True,
                    "apply_sha_freeze": False,
                }
            ],
        )
        session.add(cp)
        await session.commit()
        await session.refresh(cp)
        cp_id = str(cp.id)

    # 1. Gọi POST /api/v1/checkpoints/{cp_id}/submissions như Frontend checkpointApi.submitCheckpoint
    sub_res = await client.post(
        f"/api/v1/checkpoints/{cp_id}/submissions",
        headers={"Authorization": f"Bearer {tokens['leader']}"},
        json={
            "demo_url": "https://figma.com/proto/hackflow",
            "note": "Nộp từ giao diện HF-30",
            "submission_data": {"demo_url": "https://figma.com/proto/hackflow"},
        },
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()["data"]
    assert sub_data["demo_url"] == "https://figma.com/proto/hackflow"
    assert sub_data["note"] == "Nộp từ giao diện HF-30"

    # 2. Gọi GET /api/v1/checkpoints kèm Bearer token -> trả về latest_submission gắn kèm checkpoint
    cp_list_res = await client.get(
        "/api/v1/checkpoints",
        headers={"Authorization": f"Bearer {tokens['member']}"},
    )
    assert cp_list_res.status_code == 200
    cp_item = next(item for item in cp_list_res.json()["data"] if item["id"] == cp_id)
    assert cp_item["latest_submission"] is not None
    assert cp_item["latest_submission"]["id"] == sub_data["id"]
    assert cp_item["latest_submission"]["demo_url"] == "https://figma.com/proto/hackflow"
