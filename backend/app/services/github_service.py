import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    ServiceUnavailableException,
    UnprocessableEntityException,
)
from app.models.checkpoint import Checkpoint, SubmissionStatus
from app.schemas.github import GitHubFreezeResult, VerifyGitHubRepoResponse

logger = logging.getLogger("hackflow.github_service")


class GitHubService:
    """
    Service layer providing integration with the GitHub REST API (HF-33):
    1. Parsing and validating candidate public GitHub repository URLs.
    2. Extracting latest HEAD Commit SHA with metadata (commit message, author, timestamp).
    3. Retry strategy (up to 3 attempts with backoff) for network/timeout errors.
    4. Graceful Fallback when GitHub API is degraded/unavailable (status SHA_VERIFICATION_FAILED).
    5. Checkpoint SHA Freeze integration for final milestones (HF-23 / HF-34).
    """

    @staticmethod
    def parse_github_repo_url(repo_url: str) -> Tuple[str, str]:
        """
        Parses and validates a GitHub repository URL, returning (owner, repo).
        Supported formats:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - http://github.com/owner/repo/
        - github.com/owner/repo
        - https://github.com/owner/repo/tree/main (tree path stripped)
        """
        if not repo_url or not isinstance(repo_url, str):
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không được để trống.",
                error_code="INVALID_GITHUB_URL",
            )

        cleaned = repo_url.strip()
        pattern = r"^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)"
        match = re.search(pattern, cleaned)
        if not match:
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không hợp lệ. Định dạng chuẩn: https://github.com/{owner}/{repo}",
                error_code="INVALID_GITHUB_URL",
            )

        owner, repo = match.group(1), match.group(2)
        if repo.endswith(".git"):
            repo = repo[:-4]

        # Trailing slash or punctuation cleanup
        repo = repo.strip("/")
        if not owner or not repo:
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không hợp lệ: Không tìm thấy owner hoặc repository name.",
                error_code="INVALID_GITHUB_URL",
            )

        return owner, repo

    @staticmethod
    def _build_github_headers() -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "HackFlow-Commit-Verifier/1.0",
        }
        if settings.GITHUB_API_TOKEN:
            headers["Authorization"] = f"Bearer {settings.GITHUB_API_TOKEN}"
        return headers

    async def fetch_head_commit(
        self,
        repo_url: str,
        branch: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> VerifyGitHubRepoResponse:
        """
        Calls GitHub REST API to fetch the latest HEAD commit SHA for a public repository.
        Implements 3-retry strategy and Graceful Fallback if GitHub infrastructure is unavailable.
        """
        owner, repo = self.parse_github_repo_url(repo_url)
        normalized_url = f"https://github.com/{owner}/{repo}"

        # API endpoint: GET /repos/{owner}/{repo}/commits
        # per_page=1 returns the latest commit of the default branch or specified branch (sha parameter)
        endpoint = f"https://api.github.com/repos/{owner}/{repo}/commits"
        params = {"per_page": "1"}
        if branch:
            params["sha"] = branch

        headers = self._build_github_headers()

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            close_client = True

        last_error_message = ""
        is_infrastructure_failure = False

        try:
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(
                        f"Calling GitHub API for {owner}/{repo} (attempt {attempt}/{max_retries})"
                    )
                    response = await client.get(endpoint, params=params, headers=headers)

                    # 1. Thành công: HTTP 200 OK
                    if response.status_code == 200:
                        commits = response.json()
                        commit_item = commits[0] if isinstance(commits, list) and commits else commits
                        if not isinstance(commit_item, dict) or "sha" not in commit_item:
                            raise UnprocessableEntityException(
                                message="Dữ liệu trả về từ GitHub không hợp lệ (không tìm thấy commit hash).",
                                error_code="INVALID_GITHUB_DATA",
                            )

                        sha = commit_item.get("sha")
                        commit_obj = commit_item.get("commit", {})
                        author_obj = commit_obj.get("author", {})
                        author_name = author_obj.get("name") or commit_item.get("author", {}).get("login")
                        commit_msg = commit_obj.get("message", "").strip()

                        date_str = author_obj.get("date")
                        committed_at = None
                        if date_str:
                            try:
                                committed_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                            except Exception:
                                committed_at = datetime.now(timezone.utc)

                        html_url = commit_item.get("html_url")

                        return VerifyGitHubRepoResponse(
                            repo_url=normalized_url,
                            owner=owner,
                            repo=repo,
                            branch=branch,
                            commit_sha=sha,
                            commit_message=commit_msg,
                            author=author_name,
                            committed_at=committed_at,
                            html_url=html_url,
                            is_verified=True,
                            is_fallback=False,
                            message=f"Xác thực commit HEAD thành công: {sha[:7]} bởi {author_name or 'N/A'}.",
                        )

                    # 2. Lỗi phía thí sinh: Repo Private hoặc không tồn tại (HTTP 404 / 403 Forbidden)
                    if response.status_code in (404, 403):
                        body_text = response.text.lower()
                        # If rate limited (API rate limit exceeded): treat as retryable
                        if "rate limit" in body_text:
                            logger.warning(
                                f"GitHub Rate Limit exceeded on attempt {attempt}: {response.text}"
                            )
                            if attempt < max_retries:
                                await asyncio.sleep(retry_delay)
                                continue
                            is_infrastructure_failure = True
                            last_error_message = "Vượt quá giới hạn truy cập GitHub API (Rate Limit Exceeded)."
                            break

                        # True 404/403 private repo -> No retry, immediate 422 error
                        raise UnprocessableEntityException(
                            message=(
                                f"Repository '{owner}/{repo}' không tồn tại hoặc đang ở chế độ Riêng tư (Private). "
                                "Vui lòng kiểm tra lại URL hoặc chuyển repository sang chế độ Công khai (Public) để nộp bài."
                            ),
                            error_code="GITHUB_REPO_INACCESSIBLE",
                        )

                    # 3. Lỗi repo rỗng chưa có commit: HTTP 409 Conflict
                    if response.status_code == 409:
                        raise UnprocessableEntityException(
                            message=f"Repository '{owner}/{repo}' đang rỗng (chưa có commit nào). Vui lòng đẩy mã nguồn lên trước khi nộp bài.",
                            error_code="GITHUB_REPO_EMPTY",
                        )

                    # 4. Lỗi phía hạ tầng GitHub (500, 502, 503, 504): Có thể retry
                    if response.status_code >= 500:
                        logger.warning(
                            f"GitHub server error {response.status_code} on attempt {attempt}: {response.text}"
                        )
                        is_infrastructure_failure = True
                        last_error_message = f"GitHub Server Error HTTP {response.status_code}"
                        if attempt < max_retries:
                            await asyncio.sleep(retry_delay)
                            continue
                        break

                    # Any other client error (e.g. 422 Invalid sha branch):
                    raise UnprocessableEntityException(
                        message=f"GitHub API từ chối yêu cầu (HTTP {response.status_code}): {response.text}",
                        error_code="GITHUB_API_ERROR",
                    )

                except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                    logger.warning(
                        f"GitHub network timeout/error on attempt {attempt}/{max_retries}: {net_err}"
                    )
                    is_infrastructure_failure = True
                    last_error_message = f"Sự cố kết nối mạng đến GitHub: {str(net_err)}"
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay)
                        continue
                    break

        finally:
            if close_client:
                await client.aclose()

        # 5. GRACEFUL FALLBACK (SRS HF-23 Mục 2.4):
        # Sau 3 lần retry vẫn thất bại do sự cố mạng hoặc hạ tầng GitHub (503/504/timeout/rate limit):
        # Không từ chối bài nộp của thí sinh nếu đã gửi đúng giờ.
        # Chuyển trạng thái sang SHA_VERIFICATION_FAILED để BTC đối soát / verify thủ công.
        if is_infrastructure_failure:
            logger.error(
                f"Kích hoạt Graceful Fallback cho repo {normalized_url} sau {max_retries} lần retry thất bại: {last_error_message}"
            )
            return VerifyGitHubRepoResponse(
                repo_url=normalized_url,
                owner=owner,
                repo=repo,
                branch=branch,
                commit_sha=None,
                commit_message=None,
                author=None,
                committed_at=None,
                html_url=None,
                is_verified=False,
                is_fallback=True,
                message=(
                    f"Hạ tầng GitHub API gặp sự cố hoặc tạm thời không thể truy cập ({last_error_message}). "
                    "Hệ thống đã kích hoạt Graceful Fallback: Bài nộp vẫn được bảo lưu thời gian gửi hợp lệ "
                    "và đánh dấu trạng thái SHA_VERIFICATION_FAILED để Ban tổ chức đối soát thủ công."
                ),
            )

        raise ServiceUnavailableException(
            message=f"Không thể kết nối đến GitHub API sau {max_retries} lần thử: {last_error_message}",
            error_code="GITHUB_API_UNAVAILABLE",
        )

    async def process_checkpoint_sha_freeze(
        self,
        checkpoint: Checkpoint,
        submission_data: Optional[Dict[str, Any]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> GitHubFreezeResult:
        """
        Validates whether SHA freeze is required based on checkpoint configuration (SRS HF-23):
        - is_final_checkpoint == False: Skip GitHub API, no freeze, status = 'submitted'.
        - is_final_checkpoint == True: Extract repo_url from submission_fields (apply_sha_freeze=True),
          call GitHub API with Retry 3x, and return commit_sha or fallback status.
        """
        # 1. Checkpoint trung gian -> Không gọi GitHub API, không freeze SHA
        if not checkpoint.is_final_checkpoint:
            logger.info(
                f"Checkpoint '{checkpoint.title}' ({checkpoint.id}) không phải là final checkpoint. Bỏ qua SHA Freeze."
            )
            return GitHubFreezeResult(
                freeze_required=False,
                should_freeze=False,
                commit_sha=None,
                repo_url=None,
                status=SubmissionStatus.SUBMITTED.value,
            )

        # 2. Checkpoint chốt sản phẩm (is_final_checkpoint == True)
        data = submission_data or {}

        # Tìm trường cấu hình apply_sha_freeze == True
        target_field_key = "repo_url"
        target_field_label = "GitHub Repository URL"
        is_required = True

        if checkpoint.submission_fields and isinstance(checkpoint.submission_fields, list):
            for field in checkpoint.submission_fields:
                if isinstance(field, dict) and field.get("apply_sha_freeze"):
                    target_field_key = field.get("field_key", "repo_url")
                    target_field_label = field.get("field_label", target_field_key)
                    is_required = field.get("required", True)
                    break

        repo_url = data.get(target_field_key)

        # Nếu thiếu trường bắt buộc
        if not repo_url:
            if is_required:
                raise UnprocessableEntityException(
                    message=f"Thiếu trường nộp bài bắt buộc: '{target_field_label}' ({target_field_key}) để thực hiện đóng băng HEAD Commit SHA.",
                    error_code="MISSING_REQUIRED_FIELD",
                    data={"missing_field": target_field_key},
                )
            # Trường không bắt buộc và thí sinh không nộp
            return GitHubFreezeResult(
                freeze_required=True,
                should_freeze=False,
                commit_sha=None,
                repo_url=None,
                status=SubmissionStatus.SUBMITTED.value,
            )

        # Tiến hành trích xuất SHA qua GitHub API
        verify_res = await self.fetch_head_commit(repo_url=str(repo_url), client=client)

        # Trường hợp Graceful Fallback do sự cố hạ tầng GitHub
        if verify_res.is_fallback:
            return GitHubFreezeResult(
                freeze_required=True,
                should_freeze=True,
                commit_sha=None,
                repo_url=verify_res.repo_url,
                status=SubmissionStatus.SHA_VERIFICATION_FAILED.value,
                is_fallback=True,
                incident_note=verify_res.message,
            )

        # Thành công đóng băng SHA
        return GitHubFreezeResult(
            freeze_required=True,
            should_freeze=True,
            commit_sha=verify_res.commit_sha,
            repo_url=verify_res.repo_url,
            status=SubmissionStatus.SUBMITTED.value,
            commit_message=verify_res.commit_message,
            author=verify_res.author,
            committed_at=verify_res.committed_at,
            is_fallback=False,
        )


github_service = GitHubService()
