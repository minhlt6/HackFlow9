import asyncio
from datetime import datetime, timezone
import pytest
import httpx
from httpx import AsyncClient, Response
from unittest.mock import AsyncMock, patch

from app.core.exceptions import UnprocessableEntityException
from app.core.security import create_access_token
from app.models.checkpoint import Checkpoint, SubmissionStatus
from app.models.user import ApprovalStatus, User, UserRole
from app.schemas.github import VerifyGitHubRepoResponse
from app.services.github_service import GitHubService, github_service
from tests.conftest import TestSessionLocal


# ─── 1. Unit Tests for URL Parsing ──────────────────────────────────────────

def test_parse_github_url_success():
    """
    Test parsing valid GitHub URLs in various common formats.
    """
    valid_cases = [
        ("https://github.com/torvalds/linux", ("torvalds", "linux")),
        ("https://github.com/facebook/react.git", ("facebook", "react")),
        ("http://github.com/vuejs/core/", ("vuejs", "core")),
        ("github.com/pallets/flask", ("pallets", "flask")),
        ("https://www.github.com/fastapi/fastapi", ("fastapi", "fastapi")),
        ("https://github.com/octocat/Hello-World.git/", ("octocat", "Hello-World")),
        ("https://github.com/my-org/my.repo.name", ("my-org", "my.repo.name")),
    ]
    for url, expected in valid_cases:
        assert GitHubService.parse_github_repo_url(url) == expected


def test_parse_github_url_invalid():
    """
    Test invalid URLs raise UnprocessableEntityException with error_code=INVALID_GITHUB_URL.
    """
    invalid_cases = [
        "",
        "   ",
        "https://gitlab.com/owner/repo",
        "https://bitbucket.org/owner/repo",
        "not_a_url",
        "https://github.com/",
        "https://github.com/justowner",
    ]
    for url in invalid_cases:
        with pytest.raises(UnprocessableEntityException) as exc_info:
            GitHubService.parse_github_repo_url(url)
        assert exc_info.value.error_code == "INVALID_GITHUB_URL"


# ─── 2. Unit Tests for fetch_head_commit with Mocks ────────────────────────

@pytest.mark.asyncio
async def test_fetch_head_commit_success():
    """
    Test successful commit HEAD extraction when GitHub API returns 200 OK.
    """
    mock_commit_data = [
        {
            "sha": "a1b2c3d4e5f6789012345678901234567890abcd",
            "commit": {
                "message": "feat(core): implement time-gated checkpoints\n\nFull details here",
                "author": {
                    "name": "Le Tien Minh",
                    "date": "2026-10-14T08:00:00Z",
                },
            },
            "html_url": "https://github.com/hackflow/core/commit/a1b2c3d4e5f6789012345678901234567890abcd",
        }
    ]

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 200
    mock_response.json.return_value = mock_commit_data
    mock_client.get.return_value = mock_response

    result = await github_service.fetch_head_commit(
        repo_url="https://github.com/hackflow/core",
        client=mock_client,
    )

    assert result.is_verified is True
    assert result.is_fallback is False
    assert result.commit_sha == "a1b2c3d4e5f6789012345678901234567890abcd"
    assert result.author == "Le Tien Minh"
    assert result.commit_message == "feat(core): implement time-gated checkpoints\n\nFull details here"
    assert result.owner == "hackflow"
    assert result.repo == "core"
    assert "a1b2c3d" in result.message


@pytest.mark.asyncio
async def test_fetch_head_commit_private_or_not_found():
    """
    Test candidate error: Repository is private or non-existent (404/403).
    Must immediately raise UnprocessableEntityException with GITHUB_REPO_INACCESSIBLE (no retries).
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 404
    mock_response.text = '{"message": "Not Found"}'
    mock_client.get.return_value = mock_response

    with pytest.raises(UnprocessableEntityException) as exc_info:
        await github_service.fetch_head_commit(
            repo_url="https://github.com/private-org/secret-project",
            client=mock_client,
            max_retries=3,
        )

    assert exc_info.value.error_code == "GITHUB_REPO_INACCESSIBLE"
    assert "Riêng tư (Private)" in exc_info.value.message
    # Assert called exactly once (no retry on 404)
    assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_fetch_head_commit_empty_repository():
    """
    Test candidate error: Repository is empty (HTTP 409 Conflict).
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 409
    mock_response.text = '{"message": "Git Repository is empty."}'
    mock_client.get.return_value = mock_response

    with pytest.raises(UnprocessableEntityException) as exc_info:
        await github_service.fetch_head_commit(
            repo_url="https://github.com/hackflow/empty-repo",
            client=mock_client,
        )

    assert exc_info.value.error_code == "GITHUB_REPO_EMPTY"
    assert "rỗng" in exc_info.value.message


@pytest.mark.asyncio
async def test_fetch_head_commit_retry_and_graceful_fallback():
    """
    SRS HF-23 Acceptance Criteria:
    - Retries 3 times when encountering GitHub 503 / 504 / network timeout.
    - If all 3 attempts fail, triggers Graceful Fallback:
      Returns is_fallback=True, status SHA_VERIFICATION_FAILED without throwing 500/400.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 503
    mock_response.text = '{"message": "Service Unavailable - GitHub is having technical difficulties"}'
    mock_client.get.return_value = mock_response

    result = await github_service.fetch_head_commit(
        repo_url="https://github.com/hackflow/submission-repo",
        client=mock_client,
        max_retries=3,
        retry_delay=0.01,  # Fast for unit tests
    )

    # Verifies retry count is exactly 3
    assert mock_client.get.call_count == 3
    assert result.is_verified is False
    assert result.is_fallback is True
    assert result.commit_sha is None
    assert "Graceful Fallback" in result.message
    assert "SHA_VERIFICATION_FAILED" in result.message


# ─── 3. Unit Tests for Checkpoint SHA Freeze Process ────────────────────────

@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_intermediate():
    """
    Checkpoint trung gian (is_final_checkpoint == False):
    Must NOT call GitHub API and NOT freeze SHA. Status remains SUBMITTED.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    now = datetime.now(timezone.utc)

    intermediate_cp = Checkpoint(
        title="Checkpoint 1 - SRS & Mockup",
        start_time=now,
        deadline=now,
        is_final_checkpoint=False,
    )

    res = await github_service.process_checkpoint_sha_freeze(
        checkpoint=intermediate_cp,
        submission_data={"repo_url": "https://github.com/test/repo"},
        client=mock_client,
    )

    assert res.freeze_required is False
    assert res.should_freeze is False
    assert res.commit_sha is None
    assert res.status == SubmissionStatus.SUBMITTED.value
    # GitHub client was never invoked
    assert mock_client.get.call_count == 0


@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_final_success():
    """
    Checkpoint chốt sản phẩm (is_final_checkpoint == True):
    Calls GitHub API, extracts HEAD Commit SHA and freezes it.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {
            "sha": "9876543210abcdef9876543210abcdef98765432",
            "commit": {
                "message": "final commit before deadline",
                "author": {"name": "Team Captain", "date": "2026-10-14T10:00:00Z"},
            },
        }
    ]
    mock_client.get.return_value = mock_response

    now = datetime.now(timezone.utc)
    final_cp = Checkpoint(
        title="Final Milestone - Product Code",
        start_time=now,
        deadline=now,
        is_final_checkpoint=True,
        submission_fields=[
            {"field_key": "github_repo", "field_label": "Repository Code", "required": True, "apply_sha_freeze": True}
        ],
    )

    res = await github_service.process_checkpoint_sha_freeze(
        checkpoint=final_cp,
        submission_data={"github_repo": "https://github.com/champion/project"},
        client=mock_client,
    )

    assert res.freeze_required is True
    assert res.should_freeze is True
    assert res.commit_sha == "9876543210abcdef9876543210abcdef98765432"
    assert res.status == SubmissionStatus.SUBMITTED.value
    assert res.author == "Team Captain"
    assert res.is_fallback is False


@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_final_missing_required_field():
    """
    Checkpoint chốt sản phẩm: Thiếu trường bắt buộc có apply_sha_freeze -> Ném 422 MISSING_REQUIRED_FIELD.
    """
    now = datetime.now(timezone.utc)
    final_cp = Checkpoint(
        title="Final Milestone",
        start_time=now,
        deadline=now,
        is_final_checkpoint=True,
        submission_fields=[
            {"field_key": "repo_url", "field_label": "Source Code Repo", "required": True, "apply_sha_freeze": True}
        ],
    )

    with pytest.raises(UnprocessableEntityException) as exc_info:
        await github_service.process_checkpoint_sha_freeze(
            checkpoint=final_cp,
            submission_data={"presentation_pdf": "https://example.com/slide.pdf"},  # missing repo_url
        )

    assert exc_info.value.error_code == "MISSING_REQUIRED_FIELD"
    assert "Source Code Repo" in exc_info.value.message


@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_final_fallback():
    """
    Checkpoint chốt sản phẩm khi GitHub API sập:
    Trạng thái submission được chuyển sang SHA_VERIFICATION_FAILED và lưu incident_note.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 504
    mock_response.text = "Gateway Timeout"
    mock_client.get.return_value = mock_response

    now = datetime.now(timezone.utc)
    final_cp = Checkpoint(
        title="Final Milestone",
        start_time=now,
        deadline=now,
        is_final_checkpoint=True,
    )

    # Patch fetch_head_commit to use mock_client
    res = await github_service.process_checkpoint_sha_freeze(
        checkpoint=final_cp,
        submission_data={"repo_url": "https://github.com/team/app"},
        client=mock_client,
    )

    assert res.freeze_required is True
    assert res.is_fallback is True
    assert res.status == SubmissionStatus.SHA_VERIFICATION_FAILED.value
    assert res.commit_sha is None
    assert "đối soát thủ công" in res.incident_note


# ─── 4. Integration Test for API POST /checkpoints/verify-github-repo ───────

@pytest.mark.asyncio
async def test_api_verify_github_repo_success(client: AsyncClient):
    """
    Test API endpoint POST /api/v1/checkpoints/verify-github-repo.
    """
    async with TestSessionLocal() as session:
        user = User(
            email="test_gh_verify@hackflow.dev",
            full_name="GitHub Tester",
            role=UserRole.CANDIDATE.value,
            approval_status=ApprovalStatus.APPROVED.value,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        token = create_access_token(subject=str(user.id), claims={"role": user.role})

    # Mock fetch_head_commit in github_service
    fake_response = VerifyGitHubRepoResponse(
        repo_url="https://github.com/hackflow/api",
        owner="hackflow",
        repo="api",
        commit_sha="c0ffee1234567890c0ffee1234567890c0ffee12",
        commit_message="test: add github sha verification",
        author="Minh Developer",
        committed_at=datetime.now(timezone.utc),
        html_url="https://github.com/hackflow/api/commit/c0ffee",
        is_verified=True,
        is_fallback=False,
        message="Xác thực commit HEAD thành công: c0ffee1.",
    )

    with patch.object(github_service, "fetch_head_commit", AsyncMock(return_value=fake_response)):
        res = await client.post(
            "/api/v1/checkpoints/verify-github-repo",
            headers={"Authorization": f"Bearer {token}"},
            json={"repo_url": "https://github.com/hackflow/api"},
        )

    assert res.status_code == 200
    res_json = res.json()
    assert res_json["success"] is True
    data = res_json["data"]
    assert data["commit_sha"] == "c0ffee1234567890c0ffee1234567890c0ffee12"
    assert data["is_verified"] is True
    assert data["owner"] == "hackflow"


@pytest.mark.asyncio
async def test_api_verify_github_repo_invalid_url(client: AsyncClient):
    """
    Test API endpoint rejects invalid git URL with HTTP 422 INVALID_GITHUB_URL.
    """
    async with TestSessionLocal() as session:
        user = User(
            email="test_gh_invalid@hackflow.dev",
            full_name="GitHub Tester 2",
            role=UserRole.CANDIDATE.value,
            approval_status=ApprovalStatus.APPROVED.value,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        token = create_access_token(subject=str(user.id), claims={"role": user.role})

    res = await client.post(
        "/api/v1/checkpoints/verify-github-repo",
        headers={"Authorization": f"Bearer {token}"},
        json={"repo_url": "https://invalid-host.com/user/project"},
    )
    assert res.status_code == 422
    assert res.json()["error_code"] == "INVALID_GITHUB_URL"
