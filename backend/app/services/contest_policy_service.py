from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException
from app.models.checkpoint import Checkpoint, Submission
from app.models.config import HackathonConfig
from app.models.team import Team, TeamMember, TeamStatus
from app.services.judging_policy import judging_block_reason
from app.services.team_policy import config_team_limits


VALID_CONTEST_STATUSES = (
    "registration",
    "team_formation",
    "hacking",
    "judging",
    "completed",
)

PHASE_LABELS: Dict[str, str] = {
    "registration": "Giai đoạn 1: Mở đăng ký & Thành lập Đội thi",
    "team_formation": "Giai đoạn 2: Thành lập Đội thi & Chọn Đề tài",
    "hacking": "Giai đoạn 3: Thực thi dự án và Nộp bài các chặng",
    "judging": "Giai đoạn 4: Chấm điểm Độc lập & Bảo vệ Chung kết",
    "completed": "Giai đoạn 5: Công bố Kết quả & Vinh danh Chung cuộc",
}

UI_PHASE_LABELS: Dict[str, str] = {
    "registration": "Đăng ký tài khoản & Lập đội",
    "team_formation": "Lựa chọn đề tài & Giới hạn số lượng",
    "hacking": "Thực thi dự án & Nộp bài các chặng",
    "judging": "Hội đồng chấm thi độc lập",
    "completed": "Bế mạc & Công bố kết quả",
}

PHASE_LABEL_TO_STATUS: Dict[str, str] = {
    **{label: code for code, label in PHASE_LABELS.items()},
    **{label: code for code, label in UI_PHASE_LABELS.items()},
    "Giai đoạn 1: Đăng ký & Lập đội": "registration",
    "Giai đoạn 2: Chọn đề tài & Khóa số lượng": "team_formation",
    "Giai đoạn 3: Thực thi & Nộp bài các chặng": "hacking",
    "Giai đoạn 4: Hội đồng chấm thi độc lập": "judging",
    "Giai đoạn 5: Bế mạc & Bảng xếp hạng": "completed",
}

VALID_TEAM_SIZE_POLICIES = (
    "grandfathered_approved",
    "strict_all",
    "before_lock_only",
)

PHASE_PERMISSION_MATRIX: Dict[str, Dict[str, Any]] = {
    "registration": {
        "phase_code": "registration",
        "label": PHASE_LABELS["registration"],
        "can_register": True,
        "can_form_team": True,
        "can_select_topic": True,
        "can_cancel_topic": True,
        "can_submit_checkpoint": False,
        "can_evaluate": False,
        "can_publish_results": False,
        "note": "Cho phép đăng ký tài khoản, tạo/tham gia đội và chọn/hủy đề tài sớm.",
    },
    "team_formation": {
        "phase_code": "team_formation",
        "label": PHASE_LABELS["team_formation"],
        "can_register": True,
        "can_form_team": True,
        "can_select_topic": True,
        "can_cancel_topic": True,
        "can_submit_checkpoint": False,
        "can_evaluate": False,
        "can_publish_results": False,
        "note": "Hoàn tất đội hình và chọn/đổi đề tài trước khi khóa bước vào thực thi.",
    },
    "hacking": {
        "phase_code": "hacking",
        "label": PHASE_LABELS["hacking"],
        "can_register": True,
        "can_form_team": True,
        "can_select_topic": True,
        "can_cancel_topic": False,
        "can_submit_checkpoint": True,
        "can_evaluate": True,
        "can_publish_results": False,
        "note": "Mở nộp bài các chặng; khóa hủy đề tài (đội lập muộn chưa có đề tài vẫn được chọn nếu cổng mở).",
    },
    "judging": {
        "phase_code": "judging",
        "label": PHASE_LABELS["judging"],
        "can_register": False,
        "can_form_team": False,
        "can_select_topic": False,
        "can_cancel_topic": False,
        "can_submit_checkpoint": False,
        "can_evaluate": True,
        "can_publish_results": True,
        "note": "Đóng toàn bộ cổng đăng ký, chọn đề tài và nộp bài; Giám khảo chấm điểm độc lập.",
    },
    "completed": {
        "phase_code": "completed",
        "label": PHASE_LABELS["completed"],
        "can_register": False,
        "can_form_team": False,
        "can_select_topic": False,
        "can_cancel_topic": False,
        "can_submit_checkpoint": False,
        "can_evaluate": True,
        "can_publish_results": True,
        "note": "Cuộc thi kết thúc; công bố bảng xếp hạng chính thức.",
    },
}


def ensure_utc_dt(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_strict_bool(val: Any, field_name: str) -> bool:
    if not isinstance(val, bool):
        raise BadRequestException(
            message=f"Trường '{field_name}' bắt buộc phải là kiểu boolean (true/false), không chấp nhận '{type(val).__name__}'.",
            error_code="INVALID_BOOLEAN_FIELD",
        )
    return val


def parse_strict_datetime(val: Any, field_name: str) -> datetime:
    if isinstance(val, datetime):
        return ensure_utc_dt(val)
    if isinstance(val, str) and val.strip():
        cleaned = val.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(cleaned)
        except ValueError:
            raise BadRequestException(
                message=f"Trường thời gian '{field_name}' không đúng định dạng ISO-8601 hợp lệ.",
                error_code="INVALID_DATETIME_FIELD",
            )
        return ensure_utc_dt(dt)
    raise BadRequestException(
        message=f"Trường thời gian '{field_name}' không hợp lệ.",
        error_code="INVALID_DATETIME_FIELD",
    )


def resolve_and_validate_phase(
    raw_status: Any,
    raw_phase: Any,
    existing_status: str = "hacking",
) -> Tuple[str, str]:
    """
    Validate status and/or currentPhase strictly.
    Rejects unknown status codes, unknown phase labels, or conflicting (status, currentPhase) pairs.
    Always returns (canonical_status, canonical_phase_label).
    """
    resolved_from_status: Optional[str] = None
    resolved_from_phase: Optional[str] = None

    if raw_status is not None:
        if not isinstance(raw_status, str) or not raw_status.strip():
            raise BadRequestException(
                message="Trường 'status' phải là mã giai đoạn hợp lệ.",
                error_code="INVALID_PHASE_STATUS",
            )
        s_clean = raw_status.strip().lower()
        if s_clean not in VALID_CONTEST_STATUSES:
            raise BadRequestException(
                message=f"Trạng thái giai đoạn '{raw_status}' không hợp lệ. Chỉ chấp nhận: {', '.join(VALID_CONTEST_STATUSES)}.",
                error_code="INVALID_PHASE_STATUS",
            )
        resolved_from_status = s_clean

    if raw_phase is not None:
        if not isinstance(raw_phase, str) or not raw_phase.strip():
            raise BadRequestException(
                message="Trường 'currentPhase' phải là chuỗi tên giai đoạn hợp lệ.",
                error_code="INVALID_PHASE_LABEL",
            )
        p_clean = raw_phase.strip()
        if p_clean.lower() in VALID_CONTEST_STATUSES:
            resolved_from_phase = p_clean.lower()
        elif p_clean in PHASE_LABEL_TO_STATUS:
            resolved_from_phase = PHASE_LABEL_TO_STATUS[p_clean]
        else:
            raise BadRequestException(
                message=f"Nhãn giai đoạn '{raw_phase}' không thuộc danh mục giai đoạn hợp lệ của cuộc thi.",
                error_code="INVALID_PHASE_LABEL",
            )

    if (
        resolved_from_status is not None
        and resolved_from_phase is not None
        and resolved_from_status != resolved_from_phase
    ):
        raise BadRequestException(
            message=(
                f"Dữ liệu giai đoạn mâu thuẫn: status='{resolved_from_status}' "
                f"nhưng currentPhase tương ứng với '{resolved_from_phase}'."
            ),
            error_code="CONFLICTING_PHASE_STATUS",
        )

    final_status = (
        resolved_from_status
        or resolved_from_phase
        or (existing_status if existing_status in VALID_CONTEST_STATUSES else "hacking")
    )
    return final_status, PHASE_LABELS[final_status]


def get_contest_runtime_state(cfg: Optional[HackathonConfig]) -> Dict[str, Any]:
    """
    Compute the unified contest runtime state, separating `is_paused` from the phase `status`.
    """
    if not cfg:
        return {
            "status": "hacking",
            "currentPhase": PHASE_LABELS["hacking"],
            "uiPhaseLabel": UI_PHASE_LABELS["hacking"],
            "is_paused": False,
            "paused_at": None,
            "pause_reason": None,
            "contest_state": "running",
            "contest_state_label": "Cuộc thi đang diễn ra",
            "is_contest_started": True,
            "allows_submission": True,
            "submission_block_reason": None,
            "allows_registration": True,
            "registration_block_reason": None,
            "allows_topic_selection": True,
            "topic_selection_block_reason": None,
        }

    sdata = cfg.settings_data if isinstance(cfg.settings_data, dict) else {}
    raw_status = str(sdata.get("status") or "hacking").strip().lower()
    if raw_status not in VALID_CONTEST_STATUSES:
        raw_status = "hacking"
    is_paused = bool(sdata.get("is_paused", False))
    paused_at = sdata.get("paused_at")
    pause_reason = sdata.get("pause_reason")
    now_utc = datetime.now(timezone.utc)

    # Determine runtime state label
    if is_paused:
        contest_state = "paused"
        contest_state_label = "Cuộc thi đang tạm dừng"
    elif raw_status in {"registration", "team_formation"}:
        contest_state = "upcoming"
        contest_state_label = "Cuộc thi chưa bắt đầu thực thi"
    elif raw_status == "hacking":
        contest_state = "running"
        contest_state_label = "Cuộc thi đang diễn ra"
    elif raw_status == "judging":
        contest_state = "judging"
        contest_state_label = "Đang trong giai đoạn chấm thi"
    else:
        contest_state = "completed"
        contest_state_label = "Cuộc thi đã kết thúc"

    # 1. Submission policy
    submission_block_reason: Optional[str] = None
    if is_paused:
        reason_suffix = f" ({pause_reason})" if pause_reason else ""
        submission_block_reason = (
            f"Cuộc thi đang tạm dừng theo lệnh của Ban Tổ Chức{reason_suffix}. "
            "Các cổng nộp bài tạm khóa và hạn chót hiện tại được giữ nguyên."
        )
    elif raw_status in {"judging", "completed"}:
        submission_block_reason = (
            "Cuộc thi đã chuyển sang giai đoạn chấm điểm hoặc đã kết thúc, không thể nộp hoặc cập nhật bài thi."
        )
    elif raw_status in {"registration", "team_formation"}:
        submission_block_reason = (
            "Cuộc thi chưa bước vào giai đoạn thực thi dự án (Hacking), cổng nộp bài các chặng đang ở chế độ chờ."
        )

    # 2. Registration policy
    registration_block_reason: Optional[str] = None
    raw_reg_deadline = sdata.get("registrationDeadline")
    if is_paused:
        registration_block_reason = "Cuộc thi đang tạm dừng theo lệnh của Ban Tổ Chức."
    elif raw_status in {"judging", "completed"}:
        registration_block_reason = "Cổng đăng ký đã đóng do cuộc thi đang chấm điểm hoặc đã kết thúc."
    elif isinstance(raw_reg_deadline, str) and raw_reg_deadline.strip():
        try:
            reg_dt = parse_strict_datetime(raw_reg_deadline, "registrationDeadline")
            if now_utc > reg_dt:
                registration_block_reason = "Đã quá thời hạn đăng ký tham gia cuộc thi (registrationDeadline)."
        except Exception:
            pass

    # 3. Topic selection policy
    topic_selection_block_reason: Optional[str] = None
    start_utc = ensure_utc_dt(cfg.start_time) if cfg.start_time else None
    end_utc = ensure_utc_dt(cfg.end_time) if cfg.end_time else None
    if is_paused:
        topic_selection_block_reason = "Cuộc thi đang tạm dừng theo lệnh của Ban Tổ Chức."
    elif not cfg.is_topic_published:
        topic_selection_block_reason = "Đề tài chưa được công bố."
    elif raw_status in {"judging", "completed"}:
        topic_selection_block_reason = "Đã qua giai đoạn đăng ký đề tài."
    elif start_utc and now_utc < start_utc:
        topic_selection_block_reason = "Chưa đến thời gian đăng ký đề tài."
    elif end_utc and now_utc > end_utc:
        topic_selection_block_reason = "Thời gian đăng ký đề tài đã kết thúc."

    return {
        "status": raw_status,
        "currentPhase": PHASE_LABELS[raw_status],
        "uiPhaseLabel": UI_PHASE_LABELS[raw_status],
        "is_paused": is_paused,
        "paused_at": paused_at,
        "pause_reason": pause_reason,
        "contest_state": contest_state,
        "contest_state_label": contest_state_label,
        "is_contest_started": raw_status == "hacking" and not is_paused,
        "allows_submission": submission_block_reason is None,
        "submission_block_reason": submission_block_reason,
        "allows_registration": registration_block_reason is None,
        "registration_block_reason": registration_block_reason,
        "allows_topic_selection": topic_selection_block_reason is None,
        "topic_selection_block_reason": topic_selection_block_reason,
    }


async def compute_config_impact_preview(
    db: AsyncSession,
    cfg: HackathonConfig,
    proposed: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Compute operational impact preview for current or proposed configuration changes:
    - Teams affected by minTeamSize / maxTeamSize changes
    - Checkpoints affected by end_time / phase changes
    - Submissions pending/failed SHA verification before entering judging
    """
    sdata = dict(cfg.settings_data or {})
    body = proposed or {}

    curr_min, curr_max = config_team_limits(sdata)
    target_min = int(
        body.get("minTeamMembers")
        or body.get("minTeamSize")
        or curr_min
    )
    target_max = int(
        body.get("maxTeamMembers")
        or body.get("maxTeamSize")
        or curr_max
    )
    target_policy = str(
        body.get("teamSizeEnforcementPolicy")
        or sdata.get("teamSizeEnforcementPolicy")
        or "grandfathered_approved"
    )

    curr_status = str(sdata.get("status") or "hacking").strip().lower()
    if curr_status not in VALID_CONTEST_STATUSES:
        curr_status = "hacking"
    try:
        target_status, _ = resolve_and_validate_phase(
            body.get("status"), body.get("currentPhase"), existing_status=curr_status
        )
    except Exception:
        target_status = curr_status

    target_paused = (
        bool(body["is_paused"])
        if "is_paused" in body and isinstance(body.get("is_paused"), bool)
        else (
            bool(body["isPaused"])
            if "isPaused" in body and isinstance(body.get("isPaused"), bool)
            else bool(sdata.get("is_paused", False))
        )
    )

    # 1. Inspect Teams and member counts
    teams_res = await db.execute(select(Team))
    all_teams = list(teams_res.scalars().all())
    mems_res = await db.execute(select(TeamMember))
    mem_counts: Dict[str, int] = {}
    for m in mems_res.scalars().all():
        tid = str(m.team_id)
        mem_counts[tid] = mem_counts.get(tid, 0) + 1

    under_min_teams: List[Dict[str, Any]] = []
    over_max_teams: List[Dict[str, Any]] = []
    ineligible_teams_count = 0

    for t in all_teams:
        t_meta = t.admin_meta if isinstance(getattr(t, "admin_meta", None), dict) else {}
        is_rejected = (
            getattr(t, "status", None) == TeamStatus.REJECTED
            or str(t_meta.get("approval_status", "")).lower() == "rejected"
        )
        if is_rejected:
            continue
        tid = str(t.id)
        mc = mem_counts.get(tid, 0)
        is_approved = (
            getattr(t, "status", None) == TeamStatus.APPROVED
            or str(t_meta.get("approval_status", "")).lower() == "approved"
        )
        if mc < target_min:
            under_min_teams.append(
                {
                    "team_id": tid,
                    "team_name": t.team_name,
                    "member_count": mc,
                    "is_approved": is_approved,
                    "grandfathered": is_approved and target_policy == "grandfathered_approved",
                }
            )
        elif mc > target_max:
            over_max_teams.append(
                {
                    "team_id": tid,
                    "team_name": t.team_name,
                    "member_count": mc,
                    "is_approved": is_approved,
                }
            )

    # 2. Inspect Checkpoints & Final Submissions
    cps_res = await db.execute(select(Checkpoint).order_by(Checkpoint.display_order.asc()))
    all_cps = list(cps_res.scalars().all())
    now_utc = datetime.now(timezone.utc)
    open_checkpoints: List[Dict[str, Any]] = []
    final_cps: List[Checkpoint] = []
    for cp in all_cps:
        if cp.is_final_checkpoint:
            final_cps.append(cp)
        st = ensure_utc_dt(cp.start_time)
        dl = ensure_utc_dt(cp.deadline)
        if cp.is_active and st <= now_utc <= dl:
            open_checkpoints.append(
                {
                    "id": str(cp.id),
                    "title": cp.title,
                    "deadline": dl.isoformat(),
                    "is_final_checkpoint": bool(cp.is_final_checkpoint),
                }
            )

    subs_res = await db.execute(select(Submission))
    all_subs = list(subs_res.scalars().all())
    final_cp_ids = {str(c.id) for c in final_cps}
    unverified_final_submissions: List[Dict[str, Any]] = []
    for sub in all_subs:
        if str(sub.checkpoint_id) in final_cp_ids:
            sub.checkpoint = next((c for c in final_cps if str(c.id) == str(sub.checkpoint_id)), None)
            block = judging_block_reason(sub)
            if block:
                ineligible_teams_count += 1
                unverified_final_submissions.append(
                    {
                        "submission_id": str(sub.id),
                        "team_id": str(sub.team_id),
                        "status": sub.status,
                        "block_reason": block,
                    }
                )

    warnings: List[str] = []
    if under_min_teams:
        warnings.append(
            f"Có {len(under_min_teams)} đội hiện có ít hơn {target_min} thành viên "
            f"(chính sách: {target_policy})."
        )
    if over_max_teams:
        warnings.append(
            f"Có {len(over_max_teams)} đội hiện có nhiều hơn {target_max} thành viên."
        )
    if target_status == "judging" and open_checkpoints:
        warnings.append(
            f"Chuyển sang giai đoạn Chấm thi sẽ khóa nộp bài ngay lập tức đối với {len(open_checkpoints)} chặng đang trong giờ mở."
        )
    if target_status == "judging" and unverified_final_submissions:
        warnings.append(
            f"Đang có {len(unverified_final_submissions)} bài nộp chung kết chưa hợp lệ hoặc lỗi xác minh Commit SHA."
        )
    if target_paused:
        warnings.append(
            "Khi Tạm dừng cuộc thi, toàn bộ thao tác nộp bài, đăng ký và chọn đề tài của thí sinh sẽ bị tạm khóa; hạn chót hiện tại được giữ nguyên."
        )

    return {
        "target_status": target_status,
        "target_phase_label": PHASE_LABELS[target_status],
        "target_is_paused": target_paused,
        "team_size_impact": {
            "min_team_size": target_min,
            "max_team_size": target_max,
            "enforcement_policy": target_policy,
            "under_min_count": len(under_min_teams),
            "over_max_count": len(over_max_teams),
            "affected_count": len(under_min_teams) + len(over_max_teams),
            "under_min_teams": under_min_teams,
            "over_max_teams": over_max_teams,
        },
        "phase_transition_impact": {
            "from_status": curr_status,
            "to_status": target_status,
            "open_checkpoints_count": len(open_checkpoints),
            "open_checkpoints": open_checkpoints,
            "unverified_final_submissions_count": len(unverified_final_submissions),
            "unverified_final_submissions": unverified_final_submissions,
        },
        "warnings": warnings,
    }
