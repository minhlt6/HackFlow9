from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.core.security import hash_password
from app.models.evaluation import JudgeAssignment
from app.models.team import Team, TeamMember, TeamMemberRole
from app.models.topic import Subtopic, Topic
from app.models.user import ApprovalStatus, User, UserRole
from app.repositories.team_repo import team_repo
from app.repositories.user_repo import user_repo
from app.repositories.whitelist_repo import whitelist_repo
from app.schemas.admin import (
    CandidateApprovalRequest,
    CandidatePendingResponse,
    WhitelistAddRequest,
    WhitelistBulkAddRequest,
    WhitelistBulkAddResponse,
    WhitelistDeactivateResponse,
    WhitelistEntryResponse,
)
from app.schemas.auth import UserResponse
from app.schemas.response import ApiResponse, success_response
from app.services.team_service import team_service

router = APIRouter(prefix="/admin", tags=["Admin"])

# Metadata store for AdminTeam extra display fields (description, approval_status, rejection_reason)
_TEAM_ADMIN_META: Dict[str, Dict[str, Any]] = {}
_PERSONNEL_EXTRA_META: Dict[str, Dict[str, Any]] = {}


class AdminTeamMemberInput(BaseModel):
    full_name: str
    email: str
    github_username: Optional[str] = ""


class AdminCreateTeamRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    invite_code: Optional[str] = None
    inviteCode: Optional[str] = None
    leader_name: Optional[str] = None
    leaderName: Optional[str] = None
    leader_email: Optional[str] = None
    leaderEmail: Optional[str] = None
    leader_github: Optional[str] = ""
    university: Optional[str] = None
    major_topic_id: Optional[str] = None
    majorTopicId: Optional[str] = None
    sub_topic_id: Optional[str] = None
    subTopicId: Optional[str] = None
    member_count: Optional[int] = None
    memberCount: Optional[int] = None
    repo_url: Optional[str] = None
    repoUrl: Optional[str] = None
    members: List[AdminTeamMemberInput] = Field(default_factory=list)
    selected_topic_id: Optional[str] = None
    selected_topic_name: Optional[str] = None
    selected_track: Optional[str] = None


class AdminUpdateTeamRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    invite_code: Optional[str] = None
    inviteCode: Optional[str] = None
    leader_name: Optional[str] = None
    leaderName: Optional[str] = None
    leader_email: Optional[str] = None
    leaderEmail: Optional[str] = None
    leader_github: Optional[str] = None
    university: Optional[str] = None
    major_topic_id: Optional[str] = None
    majorTopicId: Optional[str] = None
    sub_topic_id: Optional[str] = None
    subTopicId: Optional[str] = None
    member_count: Optional[int] = None
    memberCount: Optional[int] = None
    repo_url: Optional[str] = None
    repoUrl: Optional[str] = None
    members: Optional[List[AdminTeamMemberInput]] = None
    selected_topic_id: Optional[str] = None
    selected_topic_name: Optional[str] = None
    selected_track: Optional[str] = None


class AdminBulkApproveRequest(BaseModel):
    team_ids: List[str] = Field(default_factory=list)


class AdminRejectTeamRequest(BaseModel):
    reason: str = Field(default="Không đáp ứng điều kiện quy định của BTC")


class AdminPersonnelCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    organization: Optional[str] = ""
    specialty: Optional[str] = ""
    assigned_tracks: List[str] = Field(default_factory=list)
    assigned_team_ids: List[str] = Field(default_factory=list)


def _compute_eligibility(member_count: int) -> str:
    if member_count < 3:
        return "under_min"
    if member_count > 5:
        return "over_max"
    return "valid"


def _serialize_admin_team(team: Team) -> Dict[str, Any]:
    team_id = str(team.id)
    meta = _TEAM_ADMIN_META.get(team_id, {})
    university = meta.get("university") or "ĐH Bách Khoa Hà Nội (HUST)"
    members_list: List[Dict[str, Any]] = []
    leader_id = ""
    leader_name = ""
    leader_email = ""

    for idx, m in enumerate(team.members or []):
        u = m.user
        m_role = "leader" if m.role == TeamMemberRole.LEADER.value else "member"
        u_id = str(m.user_id)
        u_name = u.full_name if u else f"Thành viên #{idx + 1}"
        u_email = u.email if u else ""
        u_gh = (u.github_username if u and u.github_username else "") or ""
        joined_iso = m.joined_at.isoformat() if m.joined_at else datetime.now(timezone.utc).isoformat()
        if m_role == "leader" or not leader_id:
            leader_id = u_id
            leader_name = u_name
            leader_email = u_email
        members_list.append(
            {
                "id": u_id,
                "user_id": u_id,
                "userId": u_id,
                "full_name": u_name,
                "fullName": u_name,
                "email": u_email,
                "role": m_role,
                "roleInTeam": m_role,
                "github_username": u_gh,
                "studentId": u_gh or f"2022{1000 + idx}",
                "school": university,
                "university": university,
                "skills": ["Team Lead", "System Design"] if m_role == "leader" else ["Full-Stack", "AI/ML"],
                "joined_at": joined_iso,
                "joinedAt": joined_iso[:10],
            }
        )

    member_count = meta.get("member_count") or len(members_list)
    eligibility = _compute_eligibility(member_count)

    # Determine approval_status
    default_approval = "approved" if team.is_locked else ("pending" if eligibility == "valid" else "pending")
    approval_status = meta.get("approval_status", default_approval)

    topic_name = meta.get("selected_topic_name")
    track_name = meta.get("selected_track")
    if team.subtopic:
        topic_name = team.subtopic.title
    if team.topic:
        track_name = team.topic.title
        if not topic_name:
            topic_name = team.topic.title

    sub_topic_id = (
        meta.get("sub_topic_id")
        or (str(team.subtopic_id) if team.subtopic_id else None)
        or meta.get("selected_topic_id")
        or (str(team.topic_id) if team.topic_id else "")
        or ""
    )
    major_topic_id = (
        meta.get("major_topic_id")
        or (str(team.topic_id) if team.topic_id else "")
        or ""
    )
    description = meta.get("description") or f"Giải pháp kỹ thuật do đội thi {team.team_name} phát triển tại Hackathon."
    repo_url = meta.get("repo_url") or None

    created_iso = team.created_at.isoformat() if team.created_at else datetime.now(timezone.utc).isoformat()
    updated_iso = team.updated_at.isoformat() if team.updated_at else created_iso

    return {
        "id": team_id,
        "name": team.team_name,
        "team_name": team.team_name,
        "invite_code": team.invite_code,
        "inviteCode": team.invite_code,
        "description": description,
        "leader_id": leader_id,
        "leaderId": leader_id,
        "leader_name": leader_name,
        "leaderName": leader_name,
        "leader_email": leader_email,
        "leaderEmail": leader_email,
        "university": university,
        "majorTopicId": major_topic_id,
        "subTopicId": sub_topic_id,
        "topicId": sub_topic_id,
        "repoUrl": repo_url,
        "repo_url": repo_url,
        "members": members_list,
        "member_count": member_count,
        "memberCount": member_count,
        "min_members": 3,
        "max_members": 5,
        "eligibility_status": eligibility,
        "approval_status": approval_status,
        "status": approval_status,
        "rejection_reason": meta.get("rejection_reason"),
        "rejectionReason": meta.get("rejection_reason"),
        "selected_topic_id": sub_topic_id or None,
        "selected_topic_name": topic_name,
        "selected_track": track_name,
        "checkpointsCompleted": meta.get("checkpoints_completed", 0),
        "totalCheckpoints": meta.get("total_checkpoints", 3),
        "is_locked": team.is_locked,
        "isLocked": team.is_locked,
        "created_at": created_iso,
        "createdAt": created_iso[:10],
        "updated_at": updated_iso,
        "approved_at": meta.get("approved_at"),
    }


async def _ensure_candidate_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    github_username: Optional[str] = None,
) -> User:
    clean_email = email.strip().lower()
    user = await user_repo.get_by_email(db, clean_email)
    if not user:
        user = User(
            email=clean_email,
            full_name=full_name.strip() or clean_email.split("@")[0],
            hashed_password=hash_password("123456"),
            role=UserRole.CANDIDATE.value,
            approval_status=ApprovalStatus.APPROVED.value,
            github_username=(github_username or "").strip() or None,
            is_active=True,
        )
        db.add(user)
        await db.flush()
    else:
        if full_name.strip():
            user.full_name = full_name.strip()
        if github_username is not None and github_username.strip():
            user.github_username = github_username.strip()
        user.approval_status = ApprovalStatus.APPROVED.value
        await db.flush()
    return user


async def _load_team_full(db: AsyncSession, team_id: str) -> Optional[Team]:
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.topic),
            selectinload(Team.subtopic),
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


# ─── Admin Teams CRUD & Approval ─────────────────────────────────────────────


@router.get(
    "/teams",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Danh sách toàn bộ các đội thi cho Admin",
)
async def list_admin_teams(
    search: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    eligibility_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    stmt = (
        select(Team)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.topic),
            selectinload(Team.subtopic),
        )
        .order_by(Team.created_at.desc())
    )
    res = await db.execute(stmt)
    teams = list(res.scalars().all())
    items = [_serialize_admin_team(t) for t in teams]

    if search and search.strip():
        q = search.strip().lower()
        items = [
            t
            for t in items
            if q in t["name"].lower()
            or q in t["invite_code"].lower()
            or q in t["leader_name"].lower()
            or q in t["leader_email"].lower()
        ]
    if approval_status and approval_status != "all":
        items = [t for t in items if t["approval_status"] == approval_status]
    if eligibility_status and eligibility_status != "all":
        items = [t for t in items if t["eligibility_status"] == eligibility_status]

    return success_response(
        data=items,
        message=f"Tải danh sách đội thi thành công ({len(items)} đội).",
    )


@router.post(
    "/teams",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=201,
    summary="BTC tạo mới đội thi",
)
async def create_admin_team(
    body: AdminCreateTeamRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cleaned_name = body.name.strip()
    if len(cleaned_name) < 2:
        raise BadRequestException(message="Tên đội thi phải có ít nhất 2 ký tự.")

    existing = await team_repo.get_by_name(db, cleaned_name)
    if existing:
        raise ConflictException(
            message=f"Tên đội '{cleaned_name}' đã tồn tại trong hệ thống.",
            error_code="TEAM_NAME_TAKEN",
        )

    leader_name = (body.leader_name or body.leaderName or "Đội trưởng").strip()
    leader_email = (body.leader_email or body.leaderEmail or f"leader.{int(datetime.now(timezone.utc).timestamp())}@hackflow.dev").strip()
    desired_member_count = body.member_count or body.memberCount or max(3, 1 + len(body.members or []))
    if desired_member_count > 5:
        raise BadRequestException(
            message="Số lượng thành viên vượt quá giới hạn tối đa 5 người/đội."
        )

    leader_user = await _ensure_candidate_user(
        db, leader_email, leader_name, body.leader_github
    )
    old_leader_mem = await team_repo.get_user_membership(db, str(leader_user.id))
    if old_leader_mem:
        await db.delete(old_leader_mem)
        await db.flush()

    requested_code = (body.invite_code or body.inviteCode or "").strip().upper()
    if requested_code:
        existing_code = await team_repo.get_by_invite_code(db, requested_code)
        invite_code = requested_code if not existing_code else await team_service.generate_invite_code(db)
    else:
        invite_code = await team_service.generate_invite_code(db)

    team = Team(
        team_name=cleaned_name,
        invite_code=invite_code,
        is_locked=False,
    )

    resolved_sub_id = body.sub_topic_id or body.subTopicId or body.selected_topic_id
    resolved_major_id = body.major_topic_id or body.majorTopicId
    if resolved_sub_id:
        sub_res = await db.execute(select(Subtopic).where(Subtopic.id == resolved_sub_id))
        sub_obj = sub_res.scalar_one_or_none()
        if sub_obj:
            team.subtopic_id = str(sub_obj.id)
            team.topic_id = str(sub_obj.topic_id)
        else:
            top_res = await db.execute(select(Topic).where(Topic.id == resolved_sub_id))
            top_obj = top_res.scalar_one_or_none()
            if top_obj:
                team.topic_id = str(top_obj.id)
    elif resolved_major_id:
        top_res = await db.execute(select(Topic).where(Topic.id == resolved_major_id))
        top_obj = top_res.scalar_one_or_none()
        if top_obj:
            team.topic_id = str(top_obj.id)

    db.add(team)
    await db.flush()

    db.add(
        TeamMember(
            team_id=str(team.id),
            user_id=str(leader_user.id),
            role=TeamMemberRole.LEADER.value,
        )
    )

    seen_user_ids = {str(leader_user.id)}
    explicit_members = list(body.members or [])
    if not explicit_members and desired_member_count > 1:
        for idx in range(2, desired_member_count + 1):
            explicit_members.append(
                AdminTeamMemberInput(
                    full_name=f"Thành viên #{idx} ({cleaned_name})",
                    email=f"member{idx}.{invite_code.lower()}@student.edu.vn",
                    github_username=f"2022100{idx}",
                )
            )

    for m_in in explicit_members:
        if not m_in.email or not m_in.email.strip():
            continue
        m_user = await _ensure_candidate_user(
            db, m_in.email, m_in.full_name, m_in.github_username
        )
        if str(m_user.id) in seen_user_ids:
            continue
        seen_user_ids.add(str(m_user.id))
        old_mem = await team_repo.get_user_membership(db, str(m_user.id))
        if old_mem:
            await db.delete(old_mem)
            await db.flush()
        db.add(
            TeamMember(
                team_id=str(team.id),
                user_id=str(m_user.id),
                role=TeamMemberRole.MEMBER.value,
            )
        )

    await db.commit()
    team_id_str = str(team.id)
    _TEAM_ADMIN_META[team_id_str] = {
        "description": (body.description or "").strip(),
        "approval_status": "approved" if desired_member_count >= 3 else "pending",
        "university": (body.university or "ĐH Bách Khoa Hà Nội (HUST)").strip(),
        "major_topic_id": resolved_major_id,
        "sub_topic_id": resolved_sub_id,
        "member_count": desired_member_count,
        "repo_url": (body.repo_url or body.repoUrl or "").strip() or None,
        "selected_topic_id": resolved_sub_id,
        "selected_topic_name": body.selected_topic_name,
        "selected_track": body.selected_track,
    }

    loaded = await _load_team_full(db, team_id_str)
    return success_response(
        data=_serialize_admin_team(loaded),
        message=f"Đã tạo đội thi '{cleaned_name}' thành công.",
        status_code=201,
    )


@router.put(
    "/teams/{team_id}",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC cập nhật thông tin đội thi",
)
async def update_admin_team(
    team_id: str,
    body: AdminUpdateTeamRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi cần cập nhật.")

    if body.name and body.name.strip() != team.team_name:
        cleaned_name = body.name.strip()
        dup = await team_repo.get_by_name(db, cleaned_name)
        if dup and str(dup.id) != str(team.id):
            raise ConflictException(
                message=f"Tên đội '{cleaned_name}' đã được sử dụng bởi đội khác."
            )
        team.team_name = cleaned_name

    requested_code = (body.invite_code or body.inviteCode or "").strip().upper()
    if requested_code and requested_code != team.invite_code:
        dup_code = await team_repo.get_by_invite_code(db, requested_code)
        if dup_code and str(dup_code.id) != str(team.id):
            raise ConflictException(
                message=f"Mã mời '{requested_code}' đã được cấp cho đội khác."
            )
        team.invite_code = requested_code

    meta = _TEAM_ADMIN_META.setdefault(str(team.id), {})
    if body.description is not None:
        meta["description"] = body.description.strip()
    if body.university is not None and body.university.strip():
        meta["university"] = body.university.strip()
    repo_val = body.repo_url if body.repo_url is not None else body.repoUrl
    if repo_val is not None:
        meta["repo_url"] = repo_val.strip() or None

    resolved_sub_id = body.sub_topic_id or body.subTopicId or body.selected_topic_id
    resolved_major_id = body.major_topic_id or body.majorTopicId
    if resolved_sub_id is not None:
        meta["sub_topic_id"] = resolved_sub_id
        meta["selected_topic_id"] = resolved_sub_id
        sub_res = await db.execute(select(Subtopic).where(Subtopic.id == resolved_sub_id))
        sub_obj = sub_res.scalar_one_or_none()
        if sub_obj:
            team.subtopic_id = str(sub_obj.id)
            team.topic_id = str(sub_obj.topic_id)
    if resolved_major_id is not None:
        meta["major_topic_id"] = resolved_major_id
        top_res = await db.execute(select(Topic).where(Topic.id == resolved_major_id))
        top_obj = top_res.scalar_one_or_none()
        if top_obj:
            team.topic_id = str(top_obj.id)

    if body.selected_topic_name is not None:
        meta["selected_topic_name"] = body.selected_topic_name
    if body.selected_track is not None:
        meta["selected_track"] = body.selected_track

    leader_name = (body.leader_name or body.leaderName or "").strip()
    leader_email = (body.leader_email or body.leaderEmail or "").strip()
    desired_member_count = body.member_count if body.member_count is not None else body.memberCount

    if body.members is not None and leader_email and leader_name:
        for existing_m in list(team.members or []):
            await db.delete(existing_m)
        await db.flush()

        leader_user = await _ensure_candidate_user(
            db, leader_email, leader_name, body.leader_github
        )
        db.add(
            TeamMember(
                team_id=str(team.id),
                user_id=str(leader_user.id),
                role=TeamMemberRole.LEADER.value,
            )
        )
        seen_ids = {str(leader_user.id)}
        for m_in in body.members or []:
            if not m_in.email or not m_in.email.strip():
                continue
            m_user = await _ensure_candidate_user(
                db, m_in.email, m_in.full_name, m_in.github_username
            )
            if str(m_user.id) in seen_ids:
                continue
            seen_ids.add(str(m_user.id))
            db.add(
                TeamMember(
                    team_id=str(team.id),
                    user_id=str(m_user.id),
                    role=TeamMemberRole.MEMBER.value,
                )
            )
    else:
        # Update existing leader's name/email if provided
        leader_mem = next(
            (m for m in (team.members or []) if m.role == TeamMemberRole.LEADER.value),
            (team.members[0] if team.members else None),
        )
        if leader_mem and leader_mem.user and leader_name:
            leader_mem.user.full_name = leader_name
        if desired_member_count is not None and 1 <= desired_member_count <= 5:
            meta["member_count"] = desired_member_count
            current_members = list(team.members or [])
            if len(current_members) < desired_member_count:
                seen_ids = {str(m.user_id) for m in current_members}
                for idx in range(len(current_members) + 1, desired_member_count + 1):
                    placeholder_email = f"member{idx}.{team.invite_code.lower()}.{str(team.id)[:4]}@student.edu.vn"
                    m_user = await _ensure_candidate_user(
                        db,
                        placeholder_email,
                        f"Thành viên #{idx} ({team.team_name})",
                        f"2022100{idx}",
                    )
                    if str(m_user.id) not in seen_ids:
                        seen_ids.add(str(m_user.id))
                        db.add(
                            TeamMember(
                                team_id=str(team.id),
                                user_id=str(m_user.id),
                                role=TeamMemberRole.MEMBER.value,
                            )
                        )
            elif len(current_members) > desired_member_count:
                non_leaders = [
                    m for m in current_members if m.role != TeamMemberRole.LEADER.value
                ]
                to_remove = len(current_members) - desired_member_count
                for m_rem in non_leaders[-to_remove:]:
                    await db.delete(m_rem)

    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, str(team.id))
    return success_response(
        data=_serialize_admin_team(loaded),
        message="Cập nhật đội thi thành công.",
    )


@router.patch(
    "/teams/{team_id}/approve",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC phê duyệt đội thi",
)
async def approve_admin_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi.")

    team.is_locked = True
    meta = _TEAM_ADMIN_META.setdefault(str(team.id), {})
    meta["approval_status"] = "approved"
    meta["rejection_reason"] = None
    meta["approved_at"] = datetime.now(timezone.utc).isoformat()
    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, str(team.id))

    return success_response(
        data=_serialize_admin_team(loaded),
        message=f"Đã phê duyệt đội thi '{team.team_name}'.",
    )


@router.post(
    "/teams/bulk-approve",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC phê duyệt hàng loạt đội thi hợp lệ",
)
async def bulk_approve_admin_teams(
    body: AdminBulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    stmt = (
        select(Team)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.topic),
            selectinload(Team.subtopic),
        )
        .order_by(Team.created_at.desc())
    )
    res = await db.execute(stmt)
    teams = list(res.scalars().all())
    id_set = set(body.team_ids or [])
    approved_count = 0
    skipped_ids: List[str] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for t in teams:
        tid = str(t.id)
        if tid not in id_set:
            continue
        meta = _TEAM_ADMIN_META.setdefault(tid, {})
        t.is_locked = True
        meta["approval_status"] = "approved"
        meta["rejection_reason"] = None
        meta["approved_at"] = now_iso
        approved_count += 1

    await db.commit()
    all_serialized = [_serialize_admin_team(t) for t in teams]
    return success_response(
        data={
            "approved_count": approved_count,
            "skipped_ids": skipped_ids,
            "teams": all_serialized,
        },
        message=f"Đã phê duyệt {approved_count} đội thi.",
    )


@router.patch(
    "/teams/{team_id}/reject",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC từ chối đội thi",
)
async def reject_admin_team(
    team_id: str,
    body: AdminRejectTeamRequest = Body(default=AdminRejectTeamRequest()),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi.")

    team.is_locked = False
    meta = _TEAM_ADMIN_META.setdefault(str(team.id), {})
    meta["approval_status"] = "rejected"
    meta["rejection_reason"] = body.reason.strip() if body.reason else "Bị từ chối bởi BTC"
    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, str(team.id))

    return success_response(
        data=_serialize_admin_team(loaded),
        message=f"Đã từ chối đội thi '{team.team_name}'.",
    )


@router.delete(
    "/teams/{team_id}",
    response_model=ApiResponse[Dict[str, str]],
    summary="BTC xóa đội thi",
)
async def delete_admin_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi cần xóa.")

    if team.topic and team.topic.current_teams > 0:
        team.topic.current_teams -= 1
    if team.subtopic and team.subtopic.current_teams > 0:
        team.subtopic.current_teams -= 1

    await db.delete(team)
    await db.commit()
    _TEAM_ADMIN_META.pop(team_id, None)

    return success_response(
        data={"deleted_id": team_id},
        message="Đã xóa đội thi thành công.",
    )


# ─── Admin Personnel (Judges & Mentors) Management ──────────────────────────


@router.get(
    "/personnel",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Danh sách Giám khảo và Cố vấn (Admin)",
)
async def list_personnel(
    role: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    allowed_roles = [UserRole.JUDGE.value, UserRole.MENTOR.value]
    if role and role.strip().lower() in allowed_roles:
        allowed_roles = [role.strip().lower()]
    stmt = (
        select(User)
        .where(User.role.in_(allowed_roles))
        .order_by(User.created_at.asc())
    )
    res = await db.execute(stmt)
    users = list(res.scalars().all())

    assign_res = await db.execute(select(JudgeAssignment))
    assignments = list(assign_res.scalars().all())
    teams_by_judge: Dict[str, List[str]] = {}
    for a in assignments:
        if a.team_id:
            teams_by_judge.setdefault(str(a.judge_id), []).append(str(a.team_id))

    data = []
    for u in users:
        uid = str(u.id)
        extra = _PERSONNEL_EXTRA_META.get(uid, {})
        default_org = "Hội đồng Giám khảo" if u.role == UserRole.JUDGE.value else "Ban Cố vấn Kỹ thuật"
        default_spec = "Full-Stack & System Architecture" if u.role == UserRole.JUDGE.value else "AI & Cloud Engineering"
        assigned_teams = teams_by_judge.get(uid) or extra.get("assigned_team_ids", [])
        data.append(
            {
                "id": uid,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "organization": extra.get("organization", default_org),
                "specialty": extra.get("specialty", default_spec),
                "assigned_tracks": extra.get("assigned_tracks", []),
                "assigned_team_ids": list(dict.fromkeys(assigned_teams)),
                "is_active": u.is_active,
            }
        )
    return success_response(data=data, message=f"Có {len(data)} nhân sự Giám khảo / Cố vấn.")


@router.post(
    "/personnel",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=201,
    summary="Thêm Giám khảo hoặc Cố vấn mới (Admin)",
)
async def create_personnel(
    body: AdminPersonnelCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    role_val = body.role.strip().lower()
    if role_val not in (UserRole.JUDGE.value, UserRole.MENTOR.value):
        raise BadRequestException(message="Vai trò nhân sự phải là 'judge' hoặc 'mentor'.")

    clean_email = body.email.strip().lower()
    existing = await user_repo.get_by_email(db, clean_email)
    if existing:
        existing.full_name = body.full_name.strip()
        existing.role = role_val
        existing.approval_status = ApprovalStatus.APPROVED.value
        existing.is_active = True
        user_obj = existing
    else:
        user_obj = User(
            email=clean_email,
            full_name=body.full_name.strip(),
            hashed_password=hash_password("123456"),
            role=role_val,
            approval_status=ApprovalStatus.APPROVED.value,
            is_active=True,
        )
        db.add(user_obj)

    await db.flush()
    uid = str(user_obj.id)
    _PERSONNEL_EXTRA_META[uid] = {
        "organization": body.organization or "Hội đồng Chuyên môn",
        "specialty": body.specialty or "Công nghệ Phần mềm & AI",
        "assigned_tracks": body.assigned_tracks or [],
        "assigned_team_ids": body.assigned_team_ids or [],
    }

    if role_val == UserRole.JUDGE.value and body.assigned_team_ids:
        for tid in body.assigned_team_ids:
            db.add(
                JudgeAssignment(
                    judge_id=uid,
                    team_id=tid,
                    assigned_by=str(current_admin.id),
                )
            )

    await db.commit()
    await db.refresh(user_obj)
    return success_response(
        data={
            "id": uid,
            "full_name": user_obj.full_name,
            "email": user_obj.email,
            "role": user_obj.role,
            "organization": _PERSONNEL_EXTRA_META[uid]["organization"],
            "specialty": _PERSONNEL_EXTRA_META[uid]["specialty"],
            "assigned_tracks": _PERSONNEL_EXTRA_META[uid]["assigned_tracks"],
            "assigned_team_ids": _PERSONNEL_EXTRA_META[uid]["assigned_team_ids"],
            "is_active": user_obj.is_active,
        },
        message=f"Đã thêm nhân sự '{user_obj.full_name}' thành công.",
        status_code=201,
    )


@router.delete(
    "/personnel/{user_id}",
    response_model=ApiResponse[Dict[str, str]],
    summary="Xóa nhân sự Giám khảo / Cố vấn (Admin)",
)
async def delete_personnel(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    u = await user_repo.get_by_id(db, user_id)
    if not u:
        raise NotFoundException(message="Không tìm thấy nhân sự.")
    await db.delete(u)
    await db.commit()
    _PERSONNEL_EXTRA_META.pop(user_id, None)
    return success_response(data={"id": user_id}, message="Đã xóa nhân sự thành công.")


# ─── Whitelist Management ────────────────────────────────────────────────────


@router.get(
    "/whitelist",
    response_model=ApiResponse[List[WhitelistEntryResponse]],
    summary="Xem toàn bộ Whitelist",
)
async def list_whitelist(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[List[WhitelistEntryResponse]]:
    """BTC xem danh sách email được phép đăng nhập."""
    entries = await whitelist_repo.get_all(db, include_inactive=include_inactive)
    data = [
        WhitelistEntryResponse(
            id=str(e.id),
            email=e.email,
            is_active=e.is_active,
            note=e.note,
            added_by=str(e.added_by) if e.added_by else None,
            created_at=e.created_at.isoformat() if e.created_at else None,
        )
        for e in entries
    ]
    return success_response(data=data, message=f"Có {len(data)} email trong whitelist.")


@router.post(
    "/whitelist",
    response_model=ApiResponse[WhitelistEntryResponse],
    summary="Thêm 1 email vào Whitelist",
    status_code=201,
)
async def add_to_whitelist(
    body: WhitelistAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistEntryResponse]:
    """BTC thêm 1 email đơn lẻ vào Whitelist."""
    entry = await whitelist_repo.add_email(
        db, body.email, added_by=str(current_user.id), note=body.note
    )
    existing_user = await user_repo.get_by_email(db, body.email)
    if existing_user and existing_user.approval_status == ApprovalStatus.PENDING.value:
        existing_user.approval_status = ApprovalStatus.APPROVED.value
        db.add(existing_user)
    await db.commit()
    await db.refresh(entry)
    data = WhitelistEntryResponse(
        id=str(entry.id),
        email=entry.email,
        is_active=entry.is_active,
        note=entry.note,
        added_by=str(entry.added_by) if entry.added_by else None,
        created_at=entry.created_at.isoformat() if entry.created_at else None,
    )
    return success_response(
        data=data,
        message="Email đã được thêm vào whitelist.",
        status_code=201,
    )


@router.post(
    "/whitelist/bulk",
    response_model=ApiResponse[WhitelistBulkAddResponse],
    summary="Import nhiều email vào Whitelist",
    status_code=201,
)
async def bulk_add_whitelist(
    body: WhitelistBulkAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistBulkAddResponse]:
    """BTC import danh sách email từ kết quả chọn lọc thí sinh."""
    entries = await whitelist_repo.bulk_add(
        db, body.emails, added_by=str(current_user.id), note=body.note
    )
    for email_str in body.emails:
        existing_user = await user_repo.get_by_email(db, email_str)
        if existing_user and existing_user.approval_status == ApprovalStatus.PENDING.value:
            existing_user.approval_status = ApprovalStatus.APPROVED.value
            db.add(existing_user)
    await db.commit()
    data = WhitelistBulkAddResponse(
        imported=len(entries),
        emails=[e.email for e in entries],
    )
    return success_response(
        data=data,
        message=f"Đã import {len(entries)} email vào whitelist.",
        status_code=201,
    )


@router.delete(
    "/whitelist/{entry_id}",
    response_model=ApiResponse[WhitelistDeactivateResponse],
    summary="Vô hiệu hóa 1 email khỏi Whitelist",
)
async def deactivate_whitelist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC vô hiệu hóa (soft-delete) 1 email khỏi Whitelist."""
    entry = await whitelist_repo.deactivate(db, entry_id)
    if not entry:
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=entry_id, email=entry.email, is_active=False),
        message="Email đã bị vô hiệu hóa khỏi whitelist.",
    )


@router.patch(
    "/whitelist/{entry_id}/reactivate",
    response_model=ApiResponse[WhitelistDeactivateResponse],
    summary="Kích hoạt lại 1 email",
)
async def reactivate_whitelist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC kích hoạt lại email đã tắt trong Whitelist."""
    entry = await whitelist_repo.reactivate(db, entry_id)
    if not entry:
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=entry_id, email=entry.email, is_active=True),
        message="Email đã được kích hoạt lại trong whitelist.",
    )


# ─── Candidate Approval ──────────────────────────────────────────────────────


@router.get(
    "/candidates/pending",
    response_model=ApiResponse[List[CandidatePendingResponse]],
    summary="Danh sách thí sinh chờ duyệt",
)
async def list_pending_candidates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[List[CandidatePendingResponse]]:
    """BTC xem toàn bộ tài khoản thí sinh đang ở trạng thái PENDING."""
    from app.api.v1.endpoints.auth import _load_profile_store
    from app.models.user import User as UserModel

    stmt = (
        select(UserModel)
        .where(
            UserModel.role == UserRole.CANDIDATE.value,
            UserModel.approval_status == ApprovalStatus.PENDING.value,
        )
        .order_by(UserModel.created_at.desc())
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    profile_store = _load_profile_store()

    data = []
    for c in candidates:
        extra = profile_store.get(str(c.id)) or profile_store.get(c.email.lower()) or {}
        data.append(
            CandidatePendingResponse(
                id=str(c.id),
                email=c.email,
                full_name=c.full_name,
                github_username=c.github_username,
                avatar_url=c.avatar_url,
                student_id=extra.get("student_id") if isinstance(extra, dict) else None,
                school=extra.get("school") if isinstance(extra, dict) else None,
                phone=extra.get("phone") if isinstance(extra, dict) else None,
                skills=extra.get("skills") if isinstance(extra, dict) else None,
                created_at=c.created_at.isoformat() if c.created_at else None,
            )
        )
    return success_response(
        data=data,
        message=f"Có {len(data)} thí sinh đang chờ duyệt.",
    )


@router.post(
    "/candidates/{user_id}/approval",
    response_model=ApiResponse[UserResponse],
    summary="BTC duyệt hoặc từ chối thí sinh",
)
async def approve_or_reject_candidate(
    user_id: str,
    body: CandidateApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
) -> ApiResponse[UserResponse]:
    candidate = await user_repo.get_by_id(db, user_id)
    if not candidate:
        raise NotFoundException(message="Không tìm thấy người dùng.")

    if candidate.approval_status != ApprovalStatus.PENDING.value:
        raise BadRequestException(
            message=f"Tài khoản này đang ở trạng thái '{candidate.approval_status}', không phải PENDING."
        )

    if body.action == "approve":
        candidate.approval_status = ApprovalStatus.APPROVED.value
        db.add(candidate)

        await whitelist_repo.add_email(
            db,
            candidate.email,
            added_by=str(current_admin.id),
            note=body.note or f"Auto-added by BTC approval — {current_admin.email}",
        )
        await db.commit()
        return success_response(
            data=UserResponse.model_validate(candidate),
            message=f"Tài khoản {candidate.email} đã được phê duyệt và thêm vào Whitelist.",
        )

    else:
        candidate.approval_status = ApprovalStatus.REJECTED.value
        db.add(candidate)
        await db.commit()
        return success_response(
            data=UserResponse.model_validate(candidate),
            message=f"Tài khoản {candidate.email} đã bị từ chối.",
        )



# ─── Admin: Personnel Update, Hackathon Config & Dashboard Stats (HF-51) ─────


class AdminPersonnelUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    specialty: Optional[str] = None
    assigned_tracks: Optional[List[str]] = None
    assigned_team_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.patch(
    "/personnel/{user_id}",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Cập nhật thông tin nhân sự Giám khảo / Cố vấn (Admin)",
)
async def update_personnel(
    user_id: str,
    body: AdminPersonnelUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    u = await user_repo.get_by_id(db, user_id)
    if not u:
        raise NotFoundException(message="Không tìm thấy nhân sự.")

    if body.full_name is not None:
        u.full_name = body.full_name.strip()
    if body.role is not None:
        role_val = body.role.strip().lower()
        if role_val not in (UserRole.JUDGE.value, UserRole.MENTOR.value):
            raise BadRequestException(message="Vai trò nhân sự phải là 'judge' hoặc 'mentor'.")
        u.role = role_val
    if body.is_active is not None:
        u.is_active = body.is_active

    uid = str(u.id)
    meta = _PERSONNEL_EXTRA_META.setdefault(
        uid,
        {
            "organization": "Hội đồng Chuyên môn",
            "specialty": "Công nghệ Phần mềm & AI",
            "assigned_tracks": [],
            "assigned_team_ids": [],
        },
    )
    if body.organization is not None:
        meta["organization"] = body.organization
    if body.specialty is not None:
        meta["specialty"] = body.specialty
    if body.assigned_tracks is not None:
        meta["assigned_tracks"] = body.assigned_tracks
    if body.assigned_team_ids is not None:
        meta["assigned_team_ids"] = body.assigned_team_ids
        if u.role == UserRole.JUDGE.value:
            old_assigns = await db.execute(
                select(JudgeAssignment).where(JudgeAssignment.judge_id == uid)
            )
            for oa in old_assigns.scalars().all():
                await db.delete(oa)
            await db.flush()
            for tid in body.assigned_team_ids:
                db.add(
                    JudgeAssignment(
                        judge_id=uid,
                        team_id=tid,
                        assigned_by=str(current_admin.id),
                    )
                )

    db.add(u)
    await db.commit()
    await db.refresh(u)
    return success_response(
        data={
            "id": uid,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "organization": meta.get("organization", "Hội đồng Chuyên môn"),
            "specialty": meta.get("specialty", "Công nghệ Phần mềm & AI"),
            "assigned_tracks": meta.get("assigned_tracks", []),
            "assigned_team_ids": meta.get("assigned_team_ids", []),
            "is_active": u.is_active,
        },
        message=f"Đã cập nhật thông tin nhân sự '{u.full_name}' thành công.",
    )


_CONFIG_EXTENDED_META: Dict[str, Any] = {
    "season": "Fall 2026",
    "status": "hacking",
    "registrationDeadline": "2026-10-14T16:59:00.000Z",
    "blindJudgingEnabled": True,
    "submissionFreezeEnabled": True,
    "maxTeamSize": 5,
    "minTeamSize": 2,
    "discrepancyThreshold": 15,
}


async def _get_or_create_hackathon_config(db: AsyncSession):
    from app.models.config import HackathonConfig

    res = await db.execute(select(HackathonConfig).order_by(HackathonConfig.created_at.asc()))
    cfg = res.scalars().first()
    if not cfg:
        cfg = HackathonConfig(
            name="HackFlow 2026 — Vietnam AI & Web3 Innovation Challenge",
            start_time=datetime(2026, 10, 15, 1, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 10, 18, 11, 0, 0, tzinfo=timezone.utc),
            is_topic_published=True,
            is_result_published=False,
        )
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


def _serialize_hackathon_config(cfg: Any) -> Dict[str, Any]:
    start_iso = cfg.start_time.isoformat() if cfg.start_time else "2026-10-15T01:00:00+00:00"
    end_iso = cfg.end_time.isoformat() if cfg.end_time else "2026-10-18T11:00:00+00:00"
    return {
        "id": str(cfg.id),
        "name": cfg.name,
        "start_time": start_iso,
        "end_time": end_iso,
        "is_topic_published": bool(cfg.is_topic_published),
        "is_result_published": bool(cfg.is_result_published),
        # Extended UI fields for AdminConfigPage
        "eventName": cfg.name,
        "season": _CONFIG_EXTENDED_META.get("season", "Fall 2026"),
        "status": _CONFIG_EXTENDED_META.get("status", "hacking"),
        "startAt": start_iso,
        "endAt": end_iso,
        "registrationDeadline": _CONFIG_EXTENDED_META.get(
            "registrationDeadline", "2026-10-14T16:59:00.000Z"
        ),
        "blindJudgingEnabled": bool(_CONFIG_EXTENDED_META.get("blindJudgingEnabled", True)),
        "leaderboardPublished": bool(cfg.is_result_published),
        "topicSelectionLocked": not bool(cfg.is_topic_published),
        "submissionFreezeEnabled": bool(_CONFIG_EXTENDED_META.get("submissionFreezeEnabled", True)),
        "maxTeamSize": int(_CONFIG_EXTENDED_META.get("maxTeamSize", 5)),
        "minTeamSize": int(_CONFIG_EXTENDED_META.get("minTeamSize", 2)),
        "discrepancyThreshold": int(_CONFIG_EXTENDED_META.get("discrepancyThreshold", 15)),
    }


@router.get(
    "/config",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Lấy cấu hình cuộc thi Hackathon (Admin - HF-51)",
)
async def get_hackathon_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cfg = await _get_or_create_hackathon_config(db)
    return success_response(
        data=_serialize_hackathon_config(cfg),
        message="Tải cấu hình cuộc thi thành công.",
    )


@router.patch(
    "/config",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Cập nhật cấu hình cuộc thi Hackathon (Admin - HF-51)",
)
async def update_hackathon_config(
    body: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cfg = await _get_or_create_hackathon_config(db)

    # 1. Name / eventName
    new_name = body.get("name") or body.get("eventName")
    if isinstance(new_name, str) and new_name.strip():
        cfg.name = new_name.strip()

    # 2. Parse start_time / startAt & end_time / endAt
    raw_start = body.get("start_time") or body.get("startAt")
    raw_end = body.get("end_time") or body.get("endAt")

    def _parse_dt(val: Any) -> Optional[datetime]:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str) and val.strip():
            cleaned = val.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        return None

    new_start = _parse_dt(raw_start) if raw_start is not None else cfg.start_time
    new_end = _parse_dt(raw_end) if raw_end is not None else cfg.end_time

    if new_start and new_end:
        s_cmp = new_start if new_start.tzinfo else new_start.replace(tzinfo=timezone.utc)
        e_cmp = new_end if new_end.tzinfo else new_end.replace(tzinfo=timezone.utc)
        if s_cmp >= e_cmp:
            raise BadRequestException(
                message="Thời gian bắt đầu (start_time) phải nhỏ hơn thời gian kết thúc (end_time)."
            )

    if new_start is not None:
        cfg.start_time = new_start
    if new_end is not None:
        cfg.end_time = new_end

    # 3. Topic & Result publish flags
    if "is_topic_published" in body and body["is_topic_published"] is not None:
        cfg.is_topic_published = bool(body["is_topic_published"])
    elif "topicSelectionLocked" in body and body["topicSelectionLocked"] is not None:
        cfg.is_topic_published = not bool(body["topicSelectionLocked"])

    if "is_result_published" in body and body["is_result_published"] is not None:
        cfg.is_result_published = bool(body["is_result_published"])
    elif "leaderboardPublished" in body and body["leaderboardPublished"] is not None:
        cfg.is_result_published = bool(body["leaderboardPublished"])

    # 4. Extended UI metadata
    for k in (
        "season",
        "status",
        "registrationDeadline",
        "blindJudgingEnabled",
        "submissionFreezeEnabled",
        "maxTeamSize",
        "minTeamSize",
        "discrepancyThreshold",
    ):
        if k in body and body[k] is not None:
            _CONFIG_EXTENDED_META[k] = body[k]

    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    return success_response(
        data=_serialize_hackathon_config(cfg),
        message="Đã lưu cấu hình toàn cục hệ thống thành công.",
    )


@router.get(
    "/stats",
    response_model=ApiResponse[Dict[str, int]],
    summary="Số liệu thống kê tổng quan cho Admin Dashboard (HF-51)",
)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    from sqlalchemy import func
    from app.models.checkpoint import Submission
    from app.models.support import SupportTicket, TicketStatus

    total_candidates_res = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.CANDIDATE.value)
    )
    pending_approvals_res = await db.execute(
        select(func.count())
        .select_from(User)
        .where(
            User.role == UserRole.CANDIDATE.value,
            User.approval_status == ApprovalStatus.PENDING.value,
        )
    )
    total_teams_res = await db.execute(select(func.count()).select_from(Team))
    total_topics_res = await db.execute(select(func.count()).select_from(Topic))
    total_submissions_res = await db.execute(select(func.count()).select_from(Submission))
    open_tickets_res = await db.execute(
        select(func.count())
        .select_from(SupportTicket)
        .where(SupportTicket.status != TicketStatus.RESOLVED.value)
    )

    stats = {
        "total_candidates": int(total_candidates_res.scalar() or 0),
        "pending_approvals": int(pending_approvals_res.scalar() or 0),
        "total_teams": int(total_teams_res.scalar() or 0),
        "total_topics": int(total_topics_res.scalar() or 0),
        "total_submissions": int(total_submissions_res.scalar() or 0),
        "open_tickets": int(open_tickets_res.scalar() or 0),
    }
    return success_response(
        data=stats,
        message="Tải số liệu thống kê tổng quan thành công.",
    )
