from datetime import datetime, timezone
import pytest
import httpx
from httpx import AsyncClient, Response
from unittest.mock import AsyncMock, patch

from app.core.config import settings
from app.core.exceptions import UnprocessableEntityException
from app.core.security import create_access_token
from app.models.checkpoint import Checkpoint, SubmissionStatus
from app.models.user import ApprovalStatus, User, UserRole
from app.schemas.github import VerifyGitHubRepoResponse
from app.services.github_service import GitHubService, github_service
from tests.conftest import TestSessionLocal


# ─── 1. Unit Tests for URL Parsing & Security ────────────────────────────────

def test_parse_github_url_success():
    """
    Test parsing valid GitHub URLs in various common formats (HTTPS, HTTP, shorthand, SSH, tree path).
    """
    valid_cases = [
        ("https://github.com/torvalds/linux", ("torvalds", "linux")),
        ("https://github.com/facebook/react.git", ("facebook", "react")),
        ("http://github.com/vuejs/core/", ("vuejs", "core")),
        ("github.com/pallets/flask", ("pallets", "flask")),
        ("https://www.github.com/fastapi/fastapi", ("fastapi", "fastapi")),
        ("https://github.com/octocat/Hello-World.git/", ("octocat", "Hello-World")),
        ("https://github.com/my-org/my.repo.name", ("my-org", "my.repo.name")),
        ("git@github.com:vercel/next.js.git", ("vercel", "next.js")),
        ("https://github.com/owner/repo/tree/develop", ("owner", "repo")),
    ]
    for url, expected in valid_cases:
        assert GitHubService.parse_github_repo_url(url) == expected

    # Branch extraction from /tree/{branch} URL
    assert GitHubService.extract_branch_from_url("https://github.com/owner/repo/tree/feature-auth") == "feature-auth"
    assert GitHubService.extract_branch_from_url("https://github.com/owner/repo") is None


def test_parse_github_url_invalid_and_path_traversal():
    """
    Test invalid URLs and SSRF/path traversal attempts raise UnprocessableEntityException (INVALID_GITHUB_URL).
    """
    invalid_cases = [
        "",
        "   ",
        "https://gitlab.com/owner/repo",
        "https://bitbucket.org/owner/repo",
        "not_a_url",
        "https://github.com/",
        "https://github.com/justowner",
        "https://github.com/../..",
        "https://github.com/./repo",
        "https://github.com/owner/..",
        "https://github.com/-invalid-owner/repo",
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
    assert result.status == SubmissionStatus.SUBMITTED.value
    assert result.error_code is None
    assert result.retry_attempts == 1
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
    mock_response.headers = {}
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
    Test candidate error: Repository is empty (HTTP 409 Conflict or empty list []).
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 409
    mock_response.headers = {}
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
    SRS HF-23 Acceptance Criteria (UAT-FIX-07):
    - Retries 3 times when encountering GitHub 503 / 504 / network timeout.
    - If all 3 attempts fail, triggers Graceful Fallback:
      Returns is_fallback=True, status='sha_verification_failed', error_code='GITHUB_API_UNAVAILABLE'.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 503
    mock_response.headers = {}
    mock_response.text = '{"message": "Service Unavailable - GitHub is having technical difficulties"}'
    mock_client.get.return_value = mock_response

    result = await github_service.fetch_head_commit(
        repo_url="https://github.com/hackflow/submission-repo",
        client=mock_client,
        max_retries=3,
        retry_delay=0.01,
    )

    assert mock_client.get.call_count == 3
    assert result.retry_attempts == 3
    assert result.is_verified is False
    assert result.is_fallback is True
    assert result.status == SubmissionStatus.SHA_VERIFICATION_FAILED.value
    assert result.error_code == "GITHUB_API_UNAVAILABLE"
    assert result.commit_sha is None
    assert "Graceful Fallback" in result.message
    assert "SHA_VERIFICATION_FAILED" in result.message


@pytest.mark.asyncio
async def test_fetch_head_commit_rate_limit_429_and_header_fallback():
    """
    Test HTTP 429 Too Many Requests and HTTP 403 X-RateLimit-Remaining: 0
    trigger 3 retries and Graceful Fallback instead of 422 candidate error.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    resp_429 = AsyncMock(spec=Response)
    resp_429.status_code = 429
    resp_429.headers = {"x-ratelimit-remaining": "0"}
    resp_429.text = '{"message": "You have exceeded a secondary rate limit"}'
    mock_client.get.return_value = resp_429

    result = await github_service.fetch_head_commit(
        repo_url="https://github.com/hackflow/ratelimited-repo",
        client=mock_client,
        max_retries=3,
        retry_delay=0.01,
    )

    assert mock_client.get.call_count == 3
    assert result.is_fallback is True
    assert result.status == SubmissionStatus.SHA_VERIFICATION_FAILED.value
    assert result.error_code == "GITHUB_API_UNAVAILABLE"


@pytest.mark.asyncio
async def test_fetch_head_commit_system_token_401_auto_recovery(monkeypatch):
    """
    If system GITHUB_API_TOKEN is expired/invalid (HTTP 401 on attempt 1),
    service strips the token on attempt 2 and succeeds for public repos.
    """
    monkeypatch.setattr(settings, "GITHUB_API_TOKEN", "expired-bad-token")

    resp_401 = AsyncMock(spec=Response)
    resp_401.status_code = 401
    resp_401.headers = {}
    resp_401.text = '{"message": "Bad credentials"}'

    resp_200 = AsyncMock(spec=Response)
    resp_200.status_code = 200
    resp_200.headers = {}
    resp_200.json.return_value = [
        {
            "sha": "1111222233334444555566667777888899990000",
            "commit": {
                "message": "chore: public repo commit",
                "author": {"name": "Public Dev", "date": "2026-10-14T09:00:00Z"},
            },
        }
    ]

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.side_effect = [resp_401, resp_200]

    result = await github_service.fetch_head_commit(
        repo_url="https://github.com/public-org/open-repo",
        client=mock_client,
        max_retries=3,
        retry_delay=0.01,
    )

    assert mock_client.get.call_count == 2
    assert result.is_verified is True
    assert result.retry_attempts == 2
    assert result.commit_sha == "1111222233334444555566667777888899990000"


# ─── 3. Unit Tests for Checkpoint SHA Freeze Process (UAT-FIX-02..08) ───────

@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_intermediate_and_dynamic_fields():
    """
    UAT-FIX-02: Checkpoint trung gian (is_final_checkpoint == False):
    - Validates dynamic required fields (e.g. slide_url required=True -> 422 MISSING_REQUIRED_FIELD if missing).
    - When valid, skips GitHub API completely and does NOT freeze SHA.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    now = datetime.now(timezone.utc)

    intermediate_cp = Checkpoint(
        title="Checkpoint 1 - SRS & Mockup",
        start_time=now,
        deadline=now,
        is_final_checkpoint=False,
        submission_fields=[
            {"field_key": "slide_url", "field_label": "Link Slide thuyết trình", "required": True, "apply_sha_freeze": False}
        ],
    )

    # 1. Missing required slide_url -> Must raise 422 MISSING_REQUIRED_FIELD
    with pytest.raises(UnprocessableEntityException) as exc_info:
        await github_service.process_checkpoint_sha_freeze(
            checkpoint=intermediate_cp,
            submission_data={"repo_url": "https://github.com/test/repo"},
            client=mock_client,
        )
    assert exc_info.value.error_code == "MISSING_REQUIRED_FIELD"
    assert "slide_url" in str(exc_info.value.data)

    # 2. Providing required slide_url -> Succeeds without calling GitHub API
    res = await github_service.process_checkpoint_sha_freeze(
        checkpoint=intermediate_cp,
        submission_data={"slide_url": "https://docs.google.com/presentation/d/123"},
        client=mock_client,
    )

    assert res.freeze_required is False
    assert res.should_freeze is False
    assert res.commit_sha is None
    assert res.status == SubmissionStatus.SUBMITTED.value
    assert mock_client.get.call_count == 0


@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_final_success():
    """
    UAT-FIX-08: Checkpoint chốt sản phẩm (is_final_checkpoint == True):
    Calls GitHub API, extracts HEAD Commit SHA and freezes it.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 200
    mock_response.headers = {}
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
            submission_data={"presentation_pdf": "https://example.com/slide.pdf"},
        )

    assert exc_info.value.error_code == "MISSING_REQUIRED_FIELD"
    assert "Source Code Repo" in exc_info.value.message


@pytest.mark.asyncio
async def test_process_checkpoint_sha_freeze_final_fallback():
    """
    UAT-FIX-07: Checkpoint chốt sản phẩm khi GitHub API sập:
    Trạng thái submission được chuyển sang SHA_VERIFICATION_FAILED và lưu incident_note.
    """
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_response = AsyncMock(spec=Response)
    mock_response.status_code = 504
    mock_response.headers = {}
    mock_response.text = "Gateway Timeout"
    mock_client.get.return_value = mock_response

    now = datetime.now(timezone.utc)
    final_cp = Checkpoint(
        title="Final Milestone",
        start_time=now,
        deadline=now,
        is_final_checkpoint=True,
    )

    res = await github_service.process_checkpoint_sha_freeze(
        checkpoint=final_cp,
        submission_data={"repo_url": "https://github.com/team/app"},
        client=mock_client,
    )

    assert res.freeze_required is True
    assert res.is_fallback is True
    assert res.status == SubmissionStatus.SHA_VERIFICATION_FAILED.value
    assert res.error_code == "GITHUB_API_UNAVAILABLE"
    assert res.retry_attempts == 3
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

    fake_response = VerifyGitHubRepoResponse(
        repo_url="https://github.com/hackflow/api",
        owner="hackflow",
        repo="api",
        commit_sha="c0ffee1234567890c0ffee1234567890c0ffee12",
        commit_message="test: add github sha verification",
        author="Minh Developer",
        committed_at=datetime.now(timezone.utc),
        html_url="https://github.com/hackflow/api/commit/c0ffee",
        status="submitted",
        error_code=None,
        retry_attempts=1,
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
    assert data["status"] == "submitted"
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
