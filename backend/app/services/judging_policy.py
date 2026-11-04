import re
from datetime import timedelta
from app.services.checkpoint_service import ensure_utc


def judging_block_reason(submission):
    if not submission or not submission.checkpoint:
        return "Đội chưa có bài nộp chung kết."
    if not submission.checkpoint.is_final_checkpoint:
        return "Đây không phải bài nộp chung kết."
    if submission.status not in {"submitted", "evaluated", "late"}:
        return "Bài chung kết chưa hợp lệ hoặc đang chờ xác minh SHA."
    if not submission.repo_url or not re.fullmatch(r"[0-9a-fA-F]{40}", submission.commit_sha or ""):
        return "Bài chung kết chưa có mã nguồn và SHA hợp lệ."
    cp = submission.checkpoint
    submitted = ensure_utc(submission.submitted_at)
    if submitted < ensure_utc(cp.start_time):
        return "Bài chung kết được ghi nhận ngoài cửa sổ nộp hợp lệ."
    if (
        submission.status != "late"
        and submitted > ensure_utc(cp.deadline) + timedelta(seconds=cp.grace_period_seconds or 0)
    ):
        return "Bài chung kết được ghi nhận ngoài cửa sổ nộp hợp lệ."
    return None
