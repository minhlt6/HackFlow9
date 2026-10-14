import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
import httpx

from app.core.config import settings
from app.core.exceptions import (
    ServiceUnavailableException,
    UnprocessableEntityException,
)
from app.models.checkpoint import Checkpoint, SubmissionStatus
from app.schemas.github import GitHubFreezeResult, VerifyGitHubRepoResponse

logger = logging.getLogger("hackflow.github_service")

SHA1_HEX_PATTERN = re.compile(r"^[0-9a-fA-F]{40}$")


class GitHubService:
    """
    Service layer providing integration with the GitHub REST API (HF-33):
    1. Parsing and validating candidate public GitHub repository URLs (HTTPS, SSH, shorthand, /tree/branch).
    2. Extracting latest HEAD Commit SHA with metadata (40-char hex validation, commit message, author, timestamp).
    3. Retry strategy (up to 3 attempts with 1s backoff) for network, timeout, 5xx, and 429/403 rate-limit errors.
    4. Token resilience: auto-fallback to unauthenticated public request if system GITHUB_API_TOKEN is expired (401).
    5. Graceful Fallback when GitHub API is degraded/unavailable (status SHA_VERIFICATION_FAILED).
    6. Dynamic submission_fields validation & Checkpoint SHA Freeze integration (HF-23 / HF-34).
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
        - git@github.com:owner/repo.git
        - https://github.com/owner/repo/tree/main (tree path stripped)
        """
        if not repo_url or not isinstance(repo_url, str):
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không được để trống.",
                error_code="INVALID_GITHUB_URL",
            )

        cleaned = repo_url.strip()
        if not cleaned:
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không được để trống.",
                error_code="INVALID_GITHUB_URL",
            )

        # Support both HTTPS/shorthand and SSH git@github.com:owner/repo.git
        https_pattern = r"^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)"
        ssh_pattern = r"^git@github\.com:([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)"

        match = re.match(https_pattern, cleaned) or re.match(ssh_pattern, cleaned)
        if not match:
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không hợp lệ. Định dạng chuẩn: https://github.com/{owner}/{repo}",
                error_code="INVALID_GITHUB_URL",
            )

        owner, repo = match.group(1), match.group(2)
        if repo.endswith(".git"):
            repo = repo[:-4]

        repo = repo.strip("/")

        # Prevent path traversal ('.' or '..') and invalid GitHub owner/repo names
        if (
            not owner
            or not repo
            or owner in (".", "..")
            or repo in (".", "..")
            or owner.startswith("-")
            or owner.startswith(".")
            or repo.startswith(".")
        ):
            raise UnprocessableEntityException(
                message="Đường dẫn GitHub repository không hợp lệ: Tên owner hoặc repository không đúng quy chuẩn GitHub.",
                error_code="INVALID_GITHUB_URL",
            )

        return owner, repo

    @staticmethod
    def extract_branch_from_url(repo_url: str) -> Optional[str]:
        """
        Extracts branch name if the candidate pasted a URL containing '/tree/{branch}'.
        """
        if not repo_url or not isinstance(repo_url, str):
            return None
        match = re.match(
            r"^(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_\-\.]+/[a-zA-Z0-9_\-\.]+/tree/([^/?#]+)",
            repo_url.strip(),
        )
        return match.group(1) if match else None

    @staticmethod
    def _build_github_headers(include_token: bool = True) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "HackFlow-Commit-Verifier/1.0",
        }
        if include_token and settings.GITHUB_API_TOKEN:
            headers["Authorization"] = f"Bearer {settings.GITHUB_API_TOKEN}"
        return headers

    @staticmethod
    def _is_rate_limit_response(response: httpx.Response) -> bool:
        """
        Checks if a 403 or 429 response from GitHub is caused by primary or secondary rate limiting.
        """
        if response.status_code == 429:
            return True
        if response.status_code == 403:
            headers = getattr(response, "headers", None) or {}
            if str(headers.get("x-ratelimit-remaining", "")).strip() == "0":
                return True
            body_lower = (response.text or "").lower()
            if "rate limit" in body_lower or "abuse detection" in body_lower:
                return True
        return False

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
        effective_branch = branch or self.extract_branch_from_url(repo_url)
        normalized_url = f"https://github.com/{owner}/{repo}"

        endpoint = f"https://api.github.com/repos/{owner}/{repo}/commits"
        params = {"per_page": "1"}
        if effective_branch:
            params["sha"] = effective_branch

        use_token = bool(settings.GITHUB_API_TOKEN)

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            close_client = True

        last_error_message = ""
        is_infrastructure_failure = False
        attempts_made = 0

        try:
            for attempt in range(1, max_retries + 1):
                attempts_made = attempt
                headers = self._build_github_headers(include_token=use_token)
                try:
                    logger.info(
                        f"Calling GitHub API for {owner}/{repo} (attempt {attempt}/{max_retries})"
                    )
                    response = await client.get(endpoint, params=params, headers=headers)

                    # 1. Thành công: HTTP 200 OK
                    if response.status_code == 200:
                        commits = response.json()
                        if isinstance(commits, list) and len(commits) == 0:
                            raise UnprocessableEntityException(
                                message=f"Repository '{owner}/{repo}' đang rỗng (chưa có commit nào). Vui lòng đẩy mã nguồn lên trước khi nộp bài.",
                                error_code="GITHUB_REPO_EMPTY",
                            )

                        commit_item = commits[0] if isinstance(commits, list) and commits else commits
                        if not isinstance(commit_item, dict) or "sha" not in commit_item:
                            raise UnprocessableEntityException(
                                message="Dữ liệu trả về từ GitHub không hợp lệ (không tìm thấy commit hash).",
                                error_code="INVALID_GITHUB_DATA",
                            )

                        sha = str(commit_item.get("sha") or "").strip()
                        if not SHA1_HEX_PATTERN.match(sha):
                            raise UnprocessableEntityException(
                                message="Mã Commit SHA trả về từ GitHub không đúng định dạng SHA-1 40 ký tự.",
                                error_code="INVALID_GITHUB_DATA",
                            )

                        commit_obj = commit_item.get("commit", {}) or {}
                        author_obj = commit_obj.get("author", {}) or {}
                        author_name = author_obj.get("name") or (commit_item.get("author") or {}).get("login")
                        commit_msg = (commit_obj.get("message") or "").strip()

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
                            branch=effective_branch,
                            commit_sha=sha,
                            commit_message=commit_msg,
                            author=author_name,
                            committed_at=committed_at,
                            html_url=html_url,
                            status=SubmissionStatus.SUBMITTED.value,
                            error_code=None,
                            retry_attempts=attempts_made,
                            is_verified=True,
                            is_fallback=False,
                            message=f"Xác thực commit HEAD thành công: {sha[:7]} bởi {author_name or 'N/A'}.",
                        )

                    # 2. Lỗi System Token hết hạn/không hợp lệ (HTTP 401 Unauthorized)
                    # Tự động gỡ token và thử lại dưới dạng public unauthenticated request
                    if response.status_code == 401:
                        logger.warning(
                            f"GitHub API returned 401 Unauthorized on attempt {attempt}. Falling back to unauthenticated request."
                        )
                        use_token = False
                        is_infrastructure_failure = True
                        last_error_message = "System GitHub Token không hợp lệ hoặc đã hết hạn (HTTP 401)."
                        if attempt < max_retries:
                            await asyncio.sleep(retry_delay)
                            continue
                        break

                    # 3. Rate Limit (HTTP 429 hoặc 403 Rate Limit / Abuse Detection) -> Retryable
                    if self._is_rate_limit_response(response):
                        logger.warning(
                            f"GitHub Rate Limit exceeded (HTTP {response.status_code}) on attempt {attempt}: {response.text}"
                        )
                        is_infrastructure_failure = True
                        last_error_message = "Vượt quá giới hạn truy cập GitHub API (Rate Limit Exceeded)."
                        if attempt < max_retries:
                            await asyncio.sleep(retry_delay)
                            continue
                        break

                    # 4. Lỗi phía thí sinh: Repo Private, không tồn tại hoặc nhánh không tồn tại (HTTP 404 / 403 / 422)
                    if response.status_code in (404, 403, 422):
                        raise UnprocessableEntityException(
                            message=(
                                f"Repository '{owner}/{repo}' không tồn tại, nhánh không hợp lệ hoặc đang ở chế độ Riêng tư (Private). "
                                "Vui lòng kiểm tra lại URL hoặc chuyển repository sang chế độ Công khai (Public) để nộp bài."
                            ),
                            error_code="GITHUB_REPO_INACCESSIBLE",
                        )

                    # 5. Lỗi repo rỗng chưa có commit: HTTP 409 Conflict
                    if response.status_code == 409:
                        raise UnprocessableEntityException(
                            message=f"Repository '{owner}/{repo}' đang rỗng (chưa có commit nào). Vui lòng đẩy mã nguồn lên trước khi nộp bài.",
                            error_code="GITHUB_REPO_EMPTY",
                        )

                    # 6. Lỗi phía hạ tầng GitHub (500, 502, 503, 504): Có thể retry
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

                    # Các mã lỗi khác từ GitHub
                    raise UnprocessableEntityException(
                        message=f"GitHub API từ chối yêu cầu (HTTP {response.status_code}): {response.text}",
                        error_code="GITHUB_REPO_INACCESSIBLE",
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

        # 7. GRACEFUL FALLBACK (SRS HF-23 Mục 2.4 & Bảng mã lỗi Mục 5):
        # Sau 3 lần retry vẫn thất bại do sự cố mạng hoặc hạ tầng GitHub (503/504/timeout/rate limit):
        # Không từ chối bài nộp của thí sinh nếu đã gửi đúng giờ.
        # Chuyển trạng thái sang SHA_VERIFICATION_FAILED để BTC đối soát / verify thủ công.
        if is_infrastructure_failure:
            logger.error(
                f"Kích hoạt Graceful Fallback cho repo {normalized_url} sau {attempts_made} lần retry thất bại: {last_error_message}"
            )
            return VerifyGitHubRepoResponse(
                repo_url=normalized_url,
                owner=owner,
                repo=repo,
                branch=effective_branch,
                commit_sha=None,
                commit_message=None,
                author=None,
                committed_at=None,
                html_url=None,
                status=SubmissionStatus.SHA_VERIFICATION_FAILED.value,
                error_code="GITHUB_API_UNAVAILABLE",
                retry_attempts=attempts_made,
                is_verified=False,
                is_fallback=True,
                message=(
                    f"Hạ tầng GitHub API gặp sự cố hoặc tạm thời không thể truy cập ({last_error_message}). "
                    "Hệ thống đã kích hoạt Graceful Fallback: Bài nộp vẫn được bảo lưu thời gian gửi hợp lệ "
                    "và đánh dấu trạng thái SHA_VERIFICATION_FAILED để Ban tổ chức đối soát thủ công."
                ),
            )

        raise ServiceUnavailableException(
            message=f"Không thể kết nối đến GitHub API sau {attempts_made} lần thử: {last_error_message}",
            error_code="GITHUB_API_UNAVAILABLE",
        )

    @staticmethod
    def validate_submission_fields(
        checkpoint: Checkpoint,
        submission_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validates dynamic submission_data against checkpoint.submission_fields (SRS HF-23 Mục 2.3 & UAT-FIX-02).
        Raises 422 MISSING_REQUIRED_FIELD if any field configured with required=True is missing or blank.
        """
        data = submission_data or {}

        if checkpoint.submission_fields and isinstance(checkpoint.submission_fields, list):
            for field in checkpoint.submission_fields:
                if not isinstance(field, dict):
                    continue
                field_key = field.get("field_key")
                if not field_key:
                    continue
                field_label = field.get("field_label", field_key)
                is_required = field.get("required", True)
                # At final checkpoint, the field with apply_sha_freeze=True is always required
                if checkpoint.is_final_checkpoint and field.get("apply_sha_freeze"):
                    is_required = True

                val = data.get(field_key)
                is_empty = val is None or (isinstance(val, str) and not val.strip())
                if is_required and is_empty:
                    raise UnprocessableEntityException(
                        message=f"Thiếu trường nộp bài bắt buộc: '{field_label}' ({field_key}).",
                        error_code="MISSING_REQUIRED_FIELD",
                        data={"missing_field": field_key},
                    )

        return data

    async def process_checkpoint_sha_freeze(
        self,
        checkpoint: Checkpoint,
        submission_data: Optional[Dict[str, Any]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> GitHubFreezeResult:
        """
        Validates dynamic submission fields and executes SHA freeze based on checkpoint configuration (SRS HF-23):
        - Step 1: Validate all required dynamic fields in checkpoint.submission_fields (raises 422 MISSING_REQUIRED_FIELD).
        - Step 2:
          + is_final_checkpoint == False: Skip GitHub API, no freeze, status = 'submitted'.
          + is_final_checkpoint == True: Extract repo_url from submission_fields (apply_sha_freeze=True),
            call GitHub API with Retry 3x, and return commit_sha or fallback status ('sha_verification_failed').
        """
        # Bước 1: Kiểm tra toàn bộ các trường bắt buộc trong submission_fields (cho cả checkpoint trung gian & cuối)
        data = self.validate_submission_fields(checkpoint, submission_data)

        # Bước 2: Checkpoint trung gian -> Không gọi GitHub API, không freeze SHA
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
                error_code=None,
                retry_attempts=0,
            )

        # Bước 3: Checkpoint chốt sản phẩm (is_final_checkpoint == True)
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
        if isinstance(repo_url, str):
            repo_url = repo_url.strip()

        # Nếu thiếu trường bắt buộc đóng băng SHA
        if not repo_url:
            if is_required:
                raise UnprocessableEntityException(
                    message=f"Thiếu trường nộp bài bắt buộc: '{target_field_label}' ({target_field_key}) để thực hiện đóng băng HEAD Commit SHA.",
                    error_code="MISSING_REQUIRED_FIELD",
                    data={"missing_field": target_field_key},
                )
            return GitHubFreezeResult(
                freeze_required=True,
                should_freeze=False,
                commit_sha=None,
                repo_url=None,
                status=SubmissionStatus.SUBMITTED.value,
                error_code=None,
                retry_attempts=0,
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
                error_code=verify_res.error_code or "GITHUB_API_UNAVAILABLE",
                retry_attempts=verify_res.retry_attempts,
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
            error_code=None,
            commit_message=verify_res.commit_message,
            author=verify_res.author,
            committed_at=verify_res.committed_at,
            retry_attempts=verify_res.retry_attempts,
            is_fallback=False,
        )


github_service = GitHubService()
