import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.config import settings
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
from app.services.team_policy import config_team_limits, get_team_limits

router = APIRouter(prefix="/admin", tags=["Admin"])
public_router = APIRouter()

def _get_team_meta(team: Team) -> Dict[str, Any]:
    base = {}
    if isinstance(getattr(team, "admin_meta", None), dict):
        base.update(team.admin_meta)
    return base


def _update_team_meta(team: Team, updates: Dict[str, Any]) -> Dict[str, Any]:
    merged = _get_team_meta(team)
    merged.update(updates)
    team.admin_meta = dict(merged)
    return merged


def _get_user_profile_extra(user_obj: Optional[User]) -> Dict[str, Any]:
    if user_obj and isinstance(getattr(user_obj, "profile_meta", None), dict):
        return dict(user_obj.profile_meta)
    return {}


def _get_personnel_meta(user_obj: User) -> Dict[str, Any]:
    base = {}
    if isinstance(getattr(user_obj, "profile_meta", None), dict):
        base.update(user_obj.profile_meta)
    return base


def _update_personnel_meta(user_obj: User, updates: Dict[str, Any]) -> Dict[str, Any]:
    merged = _get_personnel_meta(user_obj)
    merged.update(updates)
    user_obj.profile_meta = dict(merged)
    return merged


class AdminTeamMemberInput(BaseModel):
    full_name: Optional[str] = ""
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
    member_emails: List[str] = Field(default_factory=list)
    memberEmails: List[str] = Field(default_factory=list)
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
    member_emails: Optional[List[str]] = None
    memberEmails: Optional[List[str]] = None
    selected_topic_id: Optional[str] = None
    selected_topic_name: Optional[str] = None
    selected_track: Optional[str] = None


class AdminBulkApproveRequest(BaseModel):
    team_ids: List[str] = Field(default_factory=list)


class CandidateBulkApproveRequest(BaseModel):
    candidate_ids: List[str] = Field(min_length=1, max_length=10000)


class AdminAutoMatchRequest(BaseModel):
    target_team_size: int = Field(default=4, ge=1)
    fill_incomplete_teams: bool = Field(default=True)
    auto_assign_topics: bool = Field(default=True)
    auto_approve: bool = Field(default=True)


class AdminRejectTeamRequest(BaseModel):
    reason: str = Field(default="Không đáp ứng điều kiện quy định của BTC", min_length=1, max_length=2000)
    reason_code: str = Field(default="manual", pattern="^(manual|under_min)$")


class AdminPersonnelCreateRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: str
    organization: Optional[str] = ""
    specialty: Optional[str] = ""
    assigned_tracks: List[str] = Field(default_factory=list)
    assigned_team_ids: List[str] = Field(default_factory=list)


def _compute_eligibility(member_count: int, min_size: int = 3, max_size: int = 5) -> str:
    if member_count < min_size:
        return "under_min"
    if member_count > max_size:
        return "over_max"
    return "valid"


def _serialize_admin_team(team: Team, min_size: int = 3, max_size: int = 5) -> Dict[str, Any]:
    team_id = str(team.id)
    meta = _get_team_meta(team)
    university = meta.get("university") or ""
    members_list: List[Dict[str, Any]] = []
    leader_id = ""
    leader_name = ""
    leader_email = ""

    for idx, m in enumerate(team.members or []):
        u = m.user
        m_role = "leader" if m.role == TeamMemberRole.LEADER.value else "member"
        u_id = str(m.user_id)
        u_email = u.email if u else ""
        profile_extra = _get_user_profile_extra(u)
        u_name = (
            (u.full_name if u and u.full_name else "")
            or str(profile_extra.get("full_name") or "").strip()
            or f"Thành viên #{idx + 1}"
        )
        u_gh = (
            (u.github_username if u and u.github_username else "")
            or str(profile_extra.get("github_username") or "").strip()
            or ""
        )
        member_school = (
            str(profile_extra.get("school") or profile_extra.get("university") or "").strip()
            or university
            or "ĐH Bách Khoa Hà Nội (HUST)"
        )
        member_student_id = (
            str(profile_extra.get("student_id") or profile_extra.get("studentId") or "").strip()
            or u_gh
            or f"2022{1000 + idx}"
        )
        raw_skills = profile_extra.get("skills")
        if isinstance(raw_skills, list) and len(raw_skills) > 0:
            member_skills = [str(s) for s in raw_skills]
        else:
            member_skills = ["Team Lead", "System Design"] if m_role == "leader" else ["Full-Stack", "AI/ML"]

        joined_iso = m.joined_at.isoformat() if m.joined_at else datetime.now(timezone.utc).isoformat()
        if m_role == "leader" or not leader_id:
            leader_id = u_id
            leader_name = u_name
            leader_email = u_email
            if not university and member_school:
                university = member_school
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
                "studentId": member_student_id,
                "school": member_school,
                "university": member_school,
                "skills": member_skills,
                "joined_at": joined_iso,
                "joinedAt": joined_iso[:10],
            }
        )

    if not university:
        university = "ĐH Bách Khoa Hà Nội (HUST)"

    member_count = len(members_list)
    eligibility = _compute_eligibility(member_count, min_size, max_size)

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
    description = team.description or meta.get("description") or f"Giải pháp kỹ thuật do đội thi {team.team_name} phát triển tại Hackathon."
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
        "min_members": min_size,
        "max_members": max_size,
        "eligibility_status": eligibility,
        "approval_status": approval_status,
        "status": approval_status,
        "rejection_reason": meta.get("rejection_reason"),
        "rejectionReason": meta.get("rejection_reason"),
        "last_review": meta.get("last_review"),
        "review_history": meta.get("review_history", []),
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


async def _serialize_admin_teams(db: AsyncSession, teams: List[Team]) -> List[Dict[str, Any]]:
    minimum, maximum = await get_team_limits(db)
    return [_serialize_admin_team(t, minimum, maximum) for t in teams]


async def _serialize_configured_team(db: AsyncSession, team: Team) -> Dict[str, Any]:
    return (await _serialize_admin_teams(db, [team]))[0]


def _review_metadata(team: Team, actor: User, decision: str, reason: str | None,
                     minimum: int, maximum: int, reason_code: str = "manual") -> Dict[str, Any]:
    review = {
        "decision": decision, "reason": reason, "reason_code": reason_code,
        "reviewed_at": datetime.now(timezone.utc).isoformat(), "reviewed_by": str(actor.id),
        "member_count": len(team.members), "min_members": minimum, "max_members": maximum,
    }
    history = list(_get_team_meta(team).get("review_history") or [])
    history.append(review)
    return {"last_review": review, "review_history": history}


async def _ensure_candidate_user(
    db: AsyncSession,
    email: str,
    full_name: Optional[str] = "",
    github_username: Optional[str] = None,
) -> User:
    clean_email = email.strip().lower()
    user = await user_repo.get_by_email(db, clean_email)
    profile_extra = _get_user_profile_extra(user)
    resolved_name = (
        (full_name or "").strip()
        or (user.full_name if user and user.full_name else "")
        or str(profile_extra.get("full_name") or "").strip()
        or clean_email.split("@")[0].replace(".", " ").title()
    )
    resolved_gh = (
        (github_username or "").strip()
        or (user.github_username if user and user.github_username else "")
        or str(profile_extra.get("github_username") or profile_extra.get("student_id") or "").strip()
        or None
    )
    if not user:
        user = User(
            email=clean_email,
            full_name=resolved_name,
            hashed_password=hash_password("123456"),
            role=UserRole.CANDIDATE.value,
            approval_status=ApprovalStatus.APPROVED.value,
            github_username=resolved_gh,
            is_active=True,
        )
        db.add(user)
        await db.flush()
    else:
        if (full_name or "").strip():
            user.full_name = full_name.strip()
        elif not user.full_name and resolved_name:
            user.full_name = resolved_name
        if github_username is not None and github_username.strip():
            user.github_username = github_username.strip()
        elif not user.github_username and resolved_gh:
            user.github_username = resolved_gh
        user.approval_status = ApprovalStatus.APPROVED.value
        await db.flush()
    return user


async def _load_team_full(db: AsyncSession, team_id: str, for_update: bool = False) -> Optional[Team]:
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.topic),
            selectinload(Team.subtopic),
        )
    )
    if for_update:
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


def _extract_member_inputs(
    members: Optional[List[AdminTeamMemberInput]],
    member_emails_snake: Optional[List[str]],
    member_emails_camel: Optional[List[str]],
    leader_email: str,
) -> List[AdminTeamMemberInput]:
    clean_leader = leader_email.strip().lower()
    result: List[AdminTeamMemberInput] = []
    seen_emails = {clean_leader} if clean_leader else set()

    for m in members or []:
        em = (m.email or "").strip().lower()
        if not em or em in seen_emails:
            continue
        seen_emails.add(em)
        result.append(
            AdminTeamMemberInput(
                email=em,
                full_name=(m.full_name or "").strip(),
                github_username=(m.github_username or "").strip(),
            )
        )

    for raw_em in (member_emails_snake or []) + (member_emails_camel or []):
        em = (raw_em or "").strip().lower()
        if not em or em in seen_emails:
            continue
        seen_emails.add(em)
        result.append(AdminTeamMemberInput(email=em, full_name="", github_username=""))

    return result


# ─── Candidate Directory & Auto-Match for Admin Team Formation ───────────────


@router.get(
    "/candidates/directory",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Danh bạ toàn bộ thí sinh đã đăng ký kèm thông tin trường/kỹ năng và trạng thái đội thi",
)
async def list_candidates_directory(
    unassigned_only: bool = Query(False),
    approved_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    stmt = select(User).where(User.role == UserRole.CANDIDATE.value).order_by(User.created_at.asc())
    res = await db.execute(stmt)
    candidates = list(res.scalars().all())

    mem_stmt = select(TeamMember).options(selectinload(TeamMember.team))
    mem_res = await db.execute(mem_stmt)
    memberships = {str(m.user_id): m for m in mem_res.scalars().all()}

    items: List[Dict[str, Any]] = []
    for u in candidates:
        if approved_only and u.approval_status != ApprovalStatus.APPROVED.value:
            continue
        uid = str(u.id)
        mem = memberships.get(uid)
        has_team = mem is not None and mem.team is not None
        if unassigned_only and has_team:
            continue

        extra = _get_user_profile_extra(u)
        school = (
            str(extra.get("school") or extra.get("university") or "").strip()
            or "ĐH Bách Khoa Hà Nội (HUST)"
        )
        student_id = (
            str(extra.get("student_id") or extra.get("studentId") or "").strip()
            or (u.github_username or "")
            or "20225001"
        )
        raw_skills = extra.get("skills")
        skills = [str(s) for s in raw_skills] if isinstance(raw_skills, list) and raw_skills else ["Full-Stack", "AI/ML"]

        items.append(
            {
                "id": uid,
                "email": u.email,
                "full_name": u.full_name,
                "fullName": u.full_name,
                "school": school,
                "university": school,
                "student_id": student_id,
                "studentId": student_id,
                "github_username": u.github_username or "",
                "skills": skills,
                "approval_status": u.approval_status,
                "has_team": has_team,
                "hasTeam": has_team,
                "team_id": str(mem.team_id) if has_team else None,
                "teamId": str(mem.team_id) if has_team else None,
                "team_name": mem.team.team_name if has_team and mem.team else None,
                "teamName": mem.team.team_name if has_team and mem.team else None,
                "role_in_team": mem.role if has_team else None,
            }
        )

    return success_response(
        data=items,
        message=f"Đã tải {len(items)} hồ sơ thí sinh từ cơ sở dữ liệu.",
    )


@router.get(
    "/candidates/unassigned",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Danh sách thí sinh đã duyệt nhưng chưa có đội thi",
)
async def list_unassigned_candidates(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role("admin")),
):
    return await list_candidates_directory(
        unassigned_only=True,
        approved_only=True,
        db=db,
        _=admin_user,
    )


def _partition_team_sizes(total_candidates: int, preferred_size: int = 4,
                          min_size: int = 3, max_size: int = 5) -> List[int]:
    """Maximize valid teams; never create an under-minimum team."""
    if total_candidates <= 0:
        return []
    if not 1 <= min_size <= max_size:
        raise ValueError("Invalid team size limits")
    groups = total_candidates // min_size
    if not groups:
        return []
    usable = min(total_candidates, groups * max_size)
    size, extra = divmod(usable, groups)
    return [size + (1 if i < extra else 0) for i in range(groups)]


@router.post(
    "/teams/auto-match",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Tự động ghép đội ngẫu nhiên cho toàn bộ thí sinh đã đăng nhập nhưng chưa có đội",
)
async def auto_match_unassigned_candidates(
    body: AdminAutoMatchRequest = AdminAutoMatchRequest(),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    import random

    minimum, maximum = await get_team_limits(db)

    stmt_users = select(User).where(
        User.role == UserRole.CANDIDATE.value,
        User.approval_status == ApprovalStatus.APPROVED.value,
        User.is_active.is_(True),
    ).with_for_update()
    res_users = await db.execute(stmt_users)
    all_candidates = list(res_users.scalars().all())

    stmt_mems = select(TeamMember)
    res_mems = await db.execute(stmt_mems)
    assigned_user_ids = {str(m.user_id) for m in res_mems.scalars().all()}

    unassigned = [u for u in all_candidates if str(u.id) not in assigned_user_ids]
    if not unassigned:
        raise BadRequestException(
            message="Hiện không có thí sinh lẻ nào (đã duyệt & chưa có đội) để ghép đội ngẫu nhiên."
        )

    random.shuffle(unassigned)

    # Load existing teams to optionally fill under-min teams or absorb 1-2 leftover candidates
    stmt_teams = (
        select(Team)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.topic),
            selectinload(Team.subtopic),
        )
        .order_by(Team.created_at.asc())
    )
    res_teams = await db.execute(stmt_teams)
    existing_teams = list(res_teams.scalars().all())
    existing_names = {t.team_name.lower() for t in existing_teams}

    filled_existing_team_ids: List[str] = []
    matched_candidates_count = 0

    if body.fill_incomplete_teams:
        for t in existing_teams:
            curr_len = len(t.members or [])
            if (not t.is_locked and _get_team_meta(t).get("approval_status") != "rejected"
                    and curr_len < minimum and len(unassigned) >= minimum - curr_len):
                needed = minimum - curr_len
                while needed > 0 and unassigned:
                    cand = unassigned.pop(0)
                    db.add(
                        TeamMember(
                            team_id=str(t.id),
                            user_id=str(cand.id),
                            role=TeamMemberRole.MEMBER.value,
                        )
                    )
                    curr_len += 1
                    needed -= 1
                    matched_candidates_count += 1
                meta_updates: Dict[str, Any] = {"member_count": curr_len}
                if curr_len >= minimum and body.auto_approve:
                    meta_updates["approval_status"] = "approved"
                _update_team_meta(t, meta_updates)
                filled_existing_team_ids.append(str(t.id))

    # Load topics/subtopics for automatic assignment
    await db.execute(select(Topic).order_by(Topic.id).with_for_update())
    stmt_subs = select(Subtopic).options(selectinload(Subtopic.topic)).where(Subtopic.is_active.is_(True)).with_for_update()
    res_subs = await db.execute(stmt_subs)
    subtopics = list(res_subs.scalars().all())

    created_team_ids: List[str] = []
    sizes = _partition_team_sizes(len(unassigned), body.target_team_size, minimum, maximum)

    # Absorb a small remainder only into unlocked teams with available configured capacity.
    await db.flush()
    if not sizes and unassigned and body.fill_incomplete_teams:
        absorbable_teams = [t for t in existing_teams if not t.is_locked
                            and _get_team_meta(t).get("approval_status") != "rejected"]
        for t in absorbable_teams:
            curr_len = await team_repo.count_members(db, str(t.id))
            while curr_len < maximum and unassigned:
                cand = unassigned.pop(0)
                db.add(
                    TeamMember(
                        team_id=str(t.id),
                        user_id=str(cand.id),
                        role=TeamMemberRole.MEMBER.value,
                    )
                )
                curr_len += 1
                matched_candidates_count += 1
                _update_team_meta(t, {"member_count": curr_len})
                if str(t.id) not in filled_existing_team_ids:
                    filled_existing_team_ids.append(str(t.id))
        sizes = _partition_team_sizes(len(unassigned), body.target_team_size, minimum, maximum)

    team_prefixes = [
        "NovaBuilders",
        "QuantumPulse",
        "AetherForge",
        "ApexSynergy",
        "VanguardAI",
        "HyperionLab",
        "NebulaSquad",
        "TitanMatrix",
        "PhoenixCore",
        "ZenithCoders",
    ]

    for idx, group_size in enumerate(sizes):
        if group_size <= 0 or not unassigned:
            continue
        group = [unassigned.pop(0) for _ in range(min(group_size, len(unassigned)))]
        if not group:
            continue

        leader = group[0]
        leader_extra = _get_user_profile_extra(leader)
        leader_school = (
            str(leader_extra.get("school") or leader_extra.get("university") or "").strip()
            or "ĐH Bách Khoa Hà Nội (HUST)"
        )

        # Pick unique team name
        base_name = team_prefixes[idx % len(team_prefixes)]
        candidate_name = base_name
        suffix = 1
        while candidate_name.lower() in existing_names:
            suffix += 1
            candidate_name = f"{base_name} #{suffix}"
        existing_names.add(candidate_name.lower())

        invite_code = await team_service.generate_invite_code(db)
        chosen_sub = None
        if body.auto_assign_topics:
            for sub in subtopics:
                if (sub.current_teams < sub.max_teams and sub.topic and sub.topic.is_active
                        and sub.topic.current_teams < sub.topic.max_teams):
                    chosen_sub = sub
                    sub.current_teams += 1
                    sub.topic.current_teams += 1
                    break

        new_team = Team(
            team_name=candidate_name,
            description=f"Đội thi được hệ thống BTC ghép ngẫu nhiên từ {len(group)} thí sinh độc lập.",
            invite_code=invite_code,
            topic_id=str(chosen_sub.topic_id) if chosen_sub else None,
            subtopic_id=str(chosen_sub.id) if chosen_sub else None,
            is_locked=False,
        )
        db.add(new_team)
        await db.flush()

        for m_idx, member_user in enumerate(group):
            db.add(
                TeamMember(
                    team_id=str(new_team.id),
                    user_id=str(member_user.id),
                    role=TeamMemberRole.LEADER.value if m_idx == 0 else TeamMemberRole.MEMBER.value,
                )
            )
            matched_candidates_count += 1

        tid = str(new_team.id)
        created_team_ids.append(tid)
        _update_team_meta(
            new_team,
            {
                "description": new_team.description,
                "approval_status": "approved" if (body.auto_approve and len(group) >= minimum) else "pending",
                "university": leader_school,
                "major_topic_id": str(chosen_sub.topic_id) if chosen_sub else None,
                "sub_topic_id": str(chosen_sub.id) if chosen_sub else None,
                "member_count": len(group),
                "selected_topic_id": str(chosen_sub.id) if chosen_sub else None,
                "selected_topic_name": chosen_sub.title if chosen_sub else None,
                "selected_track": chosen_sub.topic.title if (chosen_sub and chosen_sub.topic) else None,
            },
        )

    await db.commit()
    db.expire_all()

    affected_ids = created_team_ids + filled_existing_team_ids
    serialized_teams: List[Dict[str, Any]] = []
    for tid in affected_ids:
        loaded_t = await _load_team_full(db, tid)
        if loaded_t:
            serialized_teams.append(await _serialize_configured_team(db, loaded_t))

    return success_response(
        data={
            "matched_candidates_count": matched_candidates_count,
            "created_teams_count": len(created_team_ids),
            "filled_teams_count": len(filled_existing_team_ids),
            "remaining_candidates_count": len(unassigned),
            "teams": serialized_teams,
        },
        message=(
            (f"Đã ghép thành công {matched_candidates_count} thí sinh vào "
            f"{len(created_team_ids)} đội mới"
            + (f" và bổ sung vào {len(filled_existing_team_ids)} đội." if filled_existing_team_ids else ".")
            if matched_candidates_count else "Chưa đủ điều kiện tạo hoặc bổ sung đội hợp lệ.")
            + (f" Còn {len(unassigned)} thí sinh chờ đủ điều kiện ghép đội." if unassigned else "")
        ),
    )


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
    items = await _serialize_admin_teams(db, teams)

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
    summary="BTC tạo mới đội thi (chỉ cần nhập email Đội trưởng & email Thành viên)",
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

    raw_leader_email = (body.leader_email or body.leaderEmail or "").strip().lower()
    if not raw_leader_email:
        if not settings.demo_enabled:
            raise BadRequestException(message="Cần cung cấp email của Đội trưởng.")
        raw_leader_email = f"leader.{int(datetime.now(timezone.utc).timestamp())}@hackflow.dev"

    raw_leader_name = (body.leader_name or body.leaderName or "").strip()
    cfg = await _get_or_create_hackathon_config(db)
    min_team_size, max_team_size = config_team_limits(cfg.settings_data)

    explicit_members = _extract_member_inputs(
        body.members, body.member_emails, body.memberEmails, raw_leader_email
    )

    requested_count = body.member_count if body.member_count is not None else body.memberCount
    desired_member_count = max(
        1 + len(explicit_members),
        int(requested_count) if requested_count is not None else (1 + len(explicit_members)),
    )
    if desired_member_count > max_team_size or (1 + len(explicit_members)) > max_team_size:
        raise BadRequestException(
            message=f"Số lượng thành viên vượt quá giới hạn tối đa {max_team_size} người/đội."
        )

    req_sub_id = (body.sub_topic_id or body.subTopicId or body.selected_topic_id or "").strip()
    req_major_id = (body.major_topic_id or body.majorTopicId or "").strip()
    if (req_sub_id or req_major_id) and desired_member_count < min_team_size:
        raise BadRequestException(
            message=f"Đội thi phải có tối thiểu {min_team_size} thành viên (tối đa {max_team_size} thành viên) mới đủ điều kiện chọn đề tài (hiện có {desired_member_count} thành viên)."
        )

    leader_user = await _ensure_candidate_user(
        db, raw_leader_email, raw_leader_name, body.leader_github
    )
    leader_extra = _get_user_profile_extra(leader_user)
    resolved_university = (
        (body.university or "").strip()
        or str(leader_extra.get("school") or leader_extra.get("university") or "").strip()
        or "ĐH Bách Khoa Hà Nội (HUST)"
    )

    old_leader_mem = await team_repo.get_user_membership(db, str(leader_user.id))
    if old_leader_mem:
        await db.delete(old_leader_mem)
        await db.flush()

    requested_code = (body.invite_code or body.inviteCode or "").strip().upper()
    if requested_code:
        existing_code = await team_repo.get_by_invite_code(db, requested_code)
        if existing_code:
            raise ConflictException(message="Mã mời đã tồn tại trong hệ thống.", error_code="INVITE_CODE_TAKEN")
        invite_code = requested_code
    else:
        invite_code = await team_service.generate_invite_code(db)

    team = Team(
        team_name=cleaned_name,
        description=(body.description or "").strip(),
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
            resolved_major_id = str(sub_obj.topic_id)
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
    while 1 + len(explicit_members) < desired_member_count:
        idx = 2 + len(explicit_members)
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

    final_member_count = len(seen_user_ids)
    team_id_str = str(team.id)
    _update_team_meta(
        team,
        {
            "description": (body.description or "").strip(),
            "approval_status": "approved" if min_team_size <= final_member_count <= max_team_size else "pending",
            "university": resolved_university,
            "major_topic_id": resolved_major_id,
            "sub_topic_id": resolved_sub_id,
            "member_count": final_member_count,
            "repo_url": (body.repo_url or body.repoUrl or "").strip() or None,
            "selected_topic_id": resolved_sub_id,
            "selected_topic_name": body.selected_topic_name,
            "selected_track": body.selected_track,
        },
    )
    await db.commit()

    loaded = await _load_team_full(db, team_id_str)
    return success_response(
        data=await _serialize_configured_team(db, loaded),
        message=f"Đã tạo đội thi '{cleaned_name}' ({final_member_count} thành viên) thành công.",
        status_code=201,
    )


@router.put(
    "/teams/{team_id}",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC cập nhật thông tin đội thi và danh sách email thành viên",
)
async def update_admin_team(
    team_id: str,
    body: AdminUpdateTeamRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id, for_update=True)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi cần cập nhật.")
    team_id_str = str(team.id)

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

    meta = _get_team_meta(team)
    if body.description is not None:
        team.description = body.description.strip()
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
            meta["major_topic_id"] = str(sub_obj.topic_id)
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
    leader_email = (body.leader_email or body.leaderEmail or "").strip().lower()
    has_member_list_update = (
        body.members is not None
        or body.member_emails is not None
        or body.memberEmails is not None
    )

    cfg = await _get_or_create_hackathon_config(db)
    min_team_size, max_team_size = config_team_limits(cfg.settings_data)
    requested_member_count = body.member_count if body.member_count is not None else body.memberCount

    if has_member_list_update:
        if not leader_email:
            leader_mem = next(
                (m for m in (team.members or []) if m.role == TeamMemberRole.LEADER.value),
                (team.members[0] if team.members else None),
            )
            leader_email = leader_mem.user.email.lower() if (leader_mem and leader_mem.user) else ""

        if not leader_email:
            raise BadRequestException(message="Cần email Đội trưởng hợp lệ để cập nhật danh sách thành viên.")

        explicit_members = _extract_member_inputs(
            body.members, body.member_emails, body.memberEmails, leader_email
        )
        target_member_count = max(
            1 + len(explicit_members),
            int(requested_member_count) if requested_member_count is not None else (1 + len(explicit_members)),
        )
        if target_member_count > max_team_size or (1 + len(explicit_members)) > max_team_size:
            raise BadRequestException(
                message=f"Số lượng thành viên vượt quá giới hạn tối đa {max_team_size} người/đội."
            )

        while 1 + len(explicit_members) < target_member_count:
            idx = 2 + len(explicit_members)
            explicit_members.append(
                AdminTeamMemberInput(
                    full_name=f"Thành viên #{idx} ({team.team_name})",
                    email=f"member{idx}.{team.invite_code.lower()}.{str(team.id)[:4]}@student.edu.vn",
                    github_username=f"2022100{idx}",
                )
            )

        for existing_m in list(team.members or []):
            await db.delete(existing_m)
        await db.flush()

        leader_user = await _ensure_candidate_user(
            db, leader_email, leader_name, body.leader_github
        )
        leader_extra = _get_user_profile_extra(leader_user)
        if not (body.university and body.university.strip()):
            inferred_uni = str(leader_extra.get("school") or leader_extra.get("university") or "").strip()
            if inferred_uni:
                meta["university"] = inferred_uni

        old_leader_mem = await team_repo.get_user_membership(db, str(leader_user.id))
        if old_leader_mem and str(old_leader_mem.team_id) != str(team.id):
            await db.delete(old_leader_mem)
            await db.flush()

        db.add(
            TeamMember(
                team_id=str(team.id),
                user_id=str(leader_user.id),
                role=TeamMemberRole.LEADER.value,
            )
        )
        seen_ids = {str(leader_user.id)}
        for m_in in explicit_members:
            if not m_in.email or not m_in.email.strip():
                continue
            m_user = await _ensure_candidate_user(
                db, m_in.email, m_in.full_name, m_in.github_username
            )
            if str(m_user.id) in seen_ids:
                continue
            seen_ids.add(str(m_user.id))
            old_mem = await team_repo.get_user_membership(db, str(m_user.id))
            if old_mem and str(old_mem.team_id) != str(team.id):
                await db.delete(old_mem)
                await db.flush()
            db.add(
                TeamMember(
                    team_id=str(team.id),
                    user_id=str(m_user.id),
                    role=TeamMemberRole.MEMBER.value,
                )
            )
        meta["member_count"] = len(seen_ids)
    else:
        # Update existing leader's name/email if provided
        leader_mem = next(
            (m for m in (team.members or []) if m.role == TeamMemberRole.LEADER.value),
            (team.members[0] if team.members else None),
        )
        if leader_mem and leader_mem.user and leader_name:
            leader_mem.user.full_name = leader_name
        desired_member_count = body.member_count if body.member_count is not None else body.memberCount
        if desired_member_count is not None and 1 <= desired_member_count <= max_team_size:
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

    final_cnt = int(meta.get("member_count") or len(team.members or []) or 1)
    if final_cnt > max_team_size:
        raise BadRequestException(
            message=f"Số lượng thành viên vượt quá giới hạn tối đa {max_team_size} người/đội."
        )
    has_topic_now = bool(resolved_sub_id or resolved_major_id)
    if has_topic_now and final_cnt < min_team_size:
        raise BadRequestException(
            message=f"Đội thi phải có tối thiểu {min_team_size} thành viên (tối đa {max_team_size} thành viên) mới đủ điều kiện chọn đề tài (hiện có {final_cnt} thành viên)."
        )

    _update_team_meta(team, meta)
    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, team_id_str)
    return success_response(
        data=await _serialize_configured_team(db, loaded),
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
    current_admin: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id, for_update=True)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi.")

    minimum, maximum = await get_team_limits(db)
    if not minimum <= len(team.members) <= maximum:
        raise ConflictException(message="Đội chưa đáp ứng giới hạn thành viên để được phê duyệt.", error_code="TEAM_SIZE_INVALID")
    review = _review_metadata(team, current_admin, "approved", None, minimum, maximum)
    team_id_str = str(team.id)
    team_name_str = team.team_name
    team.is_locked = True
    _update_team_meta(
        team,
        {
            "approval_status": "approved",
            **review,
            "rejection_reason": None,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, team_id_str)

    return success_response(
        data=await _serialize_configured_team(db, loaded),
        message=f"Đã phê duyệt đội thi '{team_name_str}'.",
    )


@router.post(
    "/teams/bulk-approve",
    response_model=ApiResponse[Dict[str, Any]],
    summary="BTC phê duyệt hàng loạt đội thi hợp lệ",
)
async def bulk_approve_admin_teams(
    body: AdminBulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
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

    minimum, maximum = await get_team_limits(db)
    for t in teams:
        tid = str(t.id)
        if tid not in id_set:
            continue
        if not minimum <= len(t.members) <= maximum:
            skipped_ids.append(tid)
            continue
        review = _review_metadata(t, current_admin, "approved", None, minimum, maximum)
        t.is_locked = True
        _update_team_meta(
            t,
            {
                "approval_status": "approved",
                **review,
                "rejection_reason": None,
                "approved_at": now_iso,
            },
        )
        approved_count += 1

    await db.commit()
    all_serialized = await _serialize_admin_teams(db, teams)
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
    current_admin: User = Depends(require_role("admin")),
):
    team = await _load_team_full(db, team_id, for_update=True)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi.")

    minimum, maximum = await get_team_limits(db)
    if not body.reason.strip():
        raise BadRequestException(message="Vui lòng nhập lý do từ chối.")
    if body.reason_code == "under_min" and len(team.members) >= minimum:
        raise ConflictException(message="Đội đã đủ thành viên tối thiểu; không thể từ chối vì thiếu thành viên.", error_code="REJECTION_REASON_INVALID")
    review = _review_metadata(team, current_admin, "rejected", body.reason.strip(), minimum, maximum, body.reason_code)
    team_id_str = str(team.id)
    team_name_str = team.team_name
    team.is_locked = False
    _update_team_meta(
        team,
        {
            "approval_status": "rejected",
            **review,
            "rejection_reason": body.reason.strip() if body.reason else "Bị từ chối bởi BTC",
        },
    )
    await db.commit()
    db.expire_all()
    loaded = await _load_team_full(db, team_id_str)

    return success_response(
        data=await _serialize_configured_team(db, loaded),
        message=f"Đã từ chối đội thi '{team_name_str}'.",
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
    team = await _load_team_full(db, team_id, for_update=True)
    if not team:
        raise NotFoundException(message="Không tìm thấy đội thi cần xóa.")

    if team.topic and team.topic.current_teams > 0:
        team.topic.current_teams -= 1
    if team.subtopic and team.subtopic.current_teams > 0:
        team.subtopic.current_teams -= 1

    await db.delete(team)
    await db.commit()

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
        .where(User.role.in_(allowed_roles), User.is_active.is_(True))
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
        extra = _get_personnel_meta(u)
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
        raise ConflictException(message="Email này đã tồn tại trong hệ thống.", error_code="EMAIL_ALREADY_EXISTS")
    if not body.full_name.strip():
        raise BadRequestException(message="Vui lòng nhập họ tên.")
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
    pers_meta = _update_personnel_meta(
        user_obj,
        {
            "organization": body.organization or "Hội đồng Chuyên môn",
            "specialty": body.specialty or "Công nghệ Phần mềm & AI",
            "assigned_tracks": body.assigned_tracks or [],
            "assigned_team_ids": body.assigned_team_ids or [],
        },
    )

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
            "organization": pers_meta["organization"],
            "specialty": pers_meta["specialty"],
            "assigned_tracks": pers_meta["assigned_tracks"],
            "assigned_team_ids": pers_meta["assigned_team_ids"],
            "is_active": user_obj.is_active,
        },
        message=f"Đã tạo tài khoản '{user_obj.full_name}' thành công.",
        status_code=201,
    )


_DEFAULT_SEEDED_PERSONNEL_EMAILS = {
    "judge.tech@hackathon.org",
    "mentor.ai@ailab.org.vn",
}

_MOCK_PERSONNEL_ID_TO_EMAIL = {
    "judge-1": "judge.tech@hackathon.org",
    "mentor-1": "mentor.ai@ailab.org.vn",
}


@router.delete(
    "/personnel/{user_id}",
    response_model=ApiResponse[Dict[str, str]],
    summary="Xóa nhân sự Giám khảo / Cố vấn (Admin)",
)
async def delete_personnel(
    user_id: str,
    email: Optional[str] = Query(None, description="Email dự phòng nếu user_id là mock ID"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    u = await user_repo.get_by_id(db, user_id)
    lookup_email = (
        email
        or _MOCK_PERSONNEL_ID_TO_EMAIL.get(user_id)
        or (user_id if "@" in user_id else None)
    )
    if not u and lookup_email:
        u = await user_repo.get_by_email(db, lookup_email.strip().lower())
    if not u:
        if user_id.startswith(("judge-", "mentor-")):
            return success_response(data={"id": user_id}, message="Đã xóa nhân sự thành công.")
        raise NotFoundException(message="Không tìm thấy nhân sự.")
    uid_str = str(u.id)
    assign_stmt = select(JudgeAssignment).where(JudgeAssignment.judge_id == uid_str)
    assign_res = await db.execute(assign_stmt)
    for a in assign_res.scalars().all():
        await db.delete(a)
    await db.execute(update(Subtopic).where(Subtopic.mentor_id == uid_str).values(mentor_id=None))
    if u.email.lower() in _DEFAULT_SEEDED_PERSONNEL_EMAILS:
        u.is_active = False
        db.add(u)
    else:
        await db.delete(u)
    await db.commit()
    return success_response(data={"id": uid_str}, message="Đã xóa nhân sự thành công.")


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
    summary="Xóa hoặc vô hiệu hóa 1 email khỏi Whitelist",
)
async def deactivate_whitelist_entry(
    entry_id: str,
    permanent: bool = Query(False, description="Nếu True sẽ xóa hẳn bản ghi khỏi Database"),
    email: Optional[str] = Query(None, description="Địa chỉ email dự phòng nếu entry_id là mock ID"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC xóa hẳn (permanent=True) hoặc vô hiệu hóa (soft-delete) 1 email khỏi Whitelist."""
    if permanent:
        entry = await whitelist_repo.delete_permanently(db, entry_id, email_hint=email)
        if entry:
            await db.commit()
            return success_response(
                data=WhitelistDeactivateResponse(id=str(entry.id), email=entry.email, is_active=False),
                message="Email đã được xóa khỏi whitelist.",
            )
        # Nếu bản ghi chỉ tồn tại ở mock client (ví dụ wl-1..wl-8), trả về 200 OK để không văng lỗi 404
        return success_response(
            data=WhitelistDeactivateResponse(id=entry_id, email=email or entry_id, is_active=False),
            message="Email đã được xóa khỏi danh sách whitelist.",
        )

    entry = await whitelist_repo.deactivate(db, entry_id, email_hint=email)
    if not entry:
        if email or entry_id.startswith("wl-"):
            return success_response(
                data=WhitelistDeactivateResponse(id=entry_id, email=email or entry_id, is_active=False),
                message="Email đã bị vô hiệu hóa khỏi whitelist.",
            )
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=str(entry.id), email=entry.email, is_active=False),
        message="Email đã bị vô hiệu hóa khỏi whitelist.",
    )


@router.patch(
    "/whitelist/{entry_id}/reactivate",
    response_model=ApiResponse[WhitelistDeactivateResponse],
    summary="Kích hoạt lại 1 email",
)
async def reactivate_whitelist_entry(
    entry_id: str,
    email: Optional[str] = Query(None, description="Địa chỉ email dự phòng nếu entry_id là mock ID"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC kích hoạt lại email đã tắt trong Whitelist."""
    entry = await whitelist_repo.reactivate(db, entry_id, email_hint=email)
    if not entry:
        if email or entry_id.startswith("wl-"):
            return success_response(
                data=WhitelistDeactivateResponse(id=entry_id, email=email or entry_id, is_active=True),
                message="Email đã được kích hoạt lại trong whitelist.",
            )
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=str(entry.id), email=entry.email, is_active=True),
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
    from app.models.user import User as UserModel

    stmt = (
        select(UserModel)
        .where(
            UserModel.role == UserRole.CANDIDATE.value,
            UserModel.approval_status == ApprovalStatus.PENDING.value,
            UserModel.is_active.is_(True),
        )
        .order_by(UserModel.created_at.desc())
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    data = []
    for c in candidates:
        extra = _get_user_profile_extra(c)
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


@router.post("/candidates/approve-all", response_model=ApiResponse[Dict[str, Any]])
async def approve_all_pending_candidates(
    body: CandidateBulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    # Explicit snapshot: new arrivals after confirmation are never silently approved.
    requested = set(body.candidate_ids)
    result = await db.execute(select(User).where(
        User.id.in_(requested), User.role == UserRole.CANDIDATE.value,
        User.is_active.is_(True), User.approval_status == ApprovalStatus.PENDING.value,
    ).order_by(User.id).with_for_update())
    candidates = result.scalars().all()
    approved = []
    for candidate in candidates:
        candidate.approval_status = ApprovalStatus.APPROVED.value
        await whitelist_repo.add_email(db, candidate.email, added_by=str(current_admin.id),
                                       note="Phê duyệt tài khoản hàng loạt bởi BTC")
        approved.append(str(candidate.id))
    from app.models.checkpoint import AuditLog
    db.add(AuditLog(user_id=str(current_admin.id), action="CANDIDATES_BULK_APPROVED", status="success",
                    details={"approved_ids": approved, "skipped_count": len(requested)-len(approved)}))
    await db.commit()
    return success_response(data={"approved_ids": approved, "approved_count": len(approved),
                                  "skipped_count": len(requested)-len(approved)},
                            message=f"Đã duyệt {len(approved)} tài khoản; bỏ qua {len(requested)-len(approved)} tài khoản không còn đủ điều kiện.")


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
    candidate = (await db.execute(select(User).where(User.id == user_id).with_for_update())).scalar_one_or_none()
    if not candidate:
        raise NotFoundException(message="Không tìm thấy người dùng.")

    if candidate.role != UserRole.CANDIDATE.value or not candidate.is_active:
        raise BadRequestException(message="Chỉ xử lý tài khoản thí sinh đang hoạt động.")

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
    meta = {
        "organization": "Hội đồng Chuyên môn",
        "specialty": "Công nghệ Phần mềm & AI",
        "assigned_tracks": [],
        "assigned_team_ids": [],
        **_get_personnel_meta(u),
    }
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

    _update_personnel_meta(u, meta)
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


async def _get_or_create_hackathon_config(db: AsyncSession):
    from app.models.config import HackathonConfig

    res = await db.execute(select(HackathonConfig).order_by(HackathonConfig.created_at.asc()))
    cfg = res.scalars().first()
    if not cfg:
        cfg = HackathonConfig(
            name="HackFlow 2026 — Vietnam AI & Web3 Innovation Challenge",
            start_time=datetime(2026, 10, 15, 1, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 12, 31, 11, 0, 0, tzinfo=timezone.utc),
            is_topic_published=True,
            is_result_published=False,
        )
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


_PHASE_LABELS: Dict[str, str] = {
    "registration": "Giai đoạn 1: Mở đăng ký & Thành lập Đội thi",
    "team_formation": "Giai đoạn 2: Thành lập Đội thi & Chọn Đề tài",
    "hacking": "Giai đoạn 3: Thực thi dự án và Nộp bài các chặng",
    "judging": "Giai đoạn 4: Chấm điểm Độc lập & Bảo vệ Chung kết",
    "completed": "Giai đoạn 5: Công bố Kết quả & Vinh danh Chung cuộc",
}


def _serialize_hackathon_config(cfg: Any) -> Dict[str, Any]:
    def utc_iso(value: datetime) -> str:
        # SQLite returns naive datetimes; SQL timestamps in this application represent UTC.
        aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return aware.astimezone(timezone.utc).isoformat()

    start_iso = utc_iso(cfg.start_time) if cfg.start_time else "2026-10-15T01:00:00+00:00"
    end_iso = utc_iso(cfg.end_time) if cfg.end_time else "2026-12-31T11:00:00+00:00"
    sdata = cfg.settings_data or {}
    raw_min, raw_max = config_team_limits(sdata)
    raw_status = str(sdata.get("status") or "hacking")
    current_phase = str(
        sdata.get("currentPhase")
        or _PHASE_LABELS.get(raw_status.lower(), raw_status)
    )
    return {
        "id": str(cfg.id),
        "name": cfg.name,
        "start_time": start_iso,
        "end_time": end_iso,
        "is_topic_published": bool(cfg.is_topic_published),
        "is_result_published": bool(cfg.is_result_published),
        # Extended UI fields for AdminConfigPage & Header
        "eventName": cfg.name,
        "season": sdata.get("season", "Fall 2026"),
        "status": raw_status,
        "currentPhase": current_phase,
        "startAt": start_iso,
        "endAt": end_iso,
        "registrationDeadline": sdata.get(
            "registrationDeadline", "2026-10-14T16:59:00.000Z"
        ),
        "blindJudgingEnabled": bool(sdata.get("blindJudgingEnabled", True)),
        "leaderboardPublished": bool(cfg.is_result_published),
        "topicSelectionLocked": not bool(cfg.is_topic_published),
        "submissionFreezeEnabled": bool(sdata.get("submissionFreezeEnabled", True)),
        "maxTeamSize": raw_max,
        "minTeamSize": raw_min,
        "maxTeamMembers": raw_max,
        "minTeamMembers": raw_min,
        "discrepancyThreshold": int(sdata.get("discrepancyThreshold", 15)),
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
            try:
                dt = datetime.fromisoformat(cleaned)
            except ValueError:
                raise BadRequestException(message="Thời gian cấu hình không hợp lệ.")
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

    for field in ("minTeamSize", "minTeamMembers", "maxTeamSize", "maxTeamMembers"):
        value = body.get(field)
        if value is not None and (isinstance(value, bool) or not isinstance(value, int) or value < 1):
            raise BadRequestException(message="Giới hạn thành viên phải là số nguyên dương.")
    for first, second in (("minTeamSize", "minTeamMembers"), ("maxTeamSize", "maxTeamMembers")):
        if body.get(first) is not None and body.get(second) is not None and body[first] != body[second]:
            raise BadRequestException(message="Các trường giới hạn thành viên không thống nhất.")

    # 4. Persist UI metadata with the competition record.
    metadata = dict(cfg.settings_data or {})
    for k in (
        "season",
        "status",
        "currentPhase",
        "registrationDeadline",
        "blindJudgingEnabled",
        "submissionFreezeEnabled",
        "maxTeamSize",
        "minTeamSize",
        "maxTeamMembers",
        "minTeamMembers",
        "discrepancyThreshold",
    ):
        if k in body and body[k] is not None:
            metadata[k] = body[k]
    if "minTeamMembers" in body and body["minTeamMembers"] is not None:
        metadata["minTeamSize"] = int(body["minTeamMembers"])
    if "minTeamSize" in body and body["minTeamSize"] is not None:
        metadata["minTeamMembers"] = int(body["minTeamSize"])
    if "maxTeamMembers" in body and body["maxTeamMembers"] is not None:
        metadata["maxTeamSize"] = int(body["maxTeamMembers"])
    if "maxTeamSize" in body and body["maxTeamSize"] is not None:
        metadata["maxTeamMembers"] = int(body["maxTeamSize"])

    min_v, max_v = config_team_limits(metadata)
    if min_v < 1 or max_v < min_v:
        raise BadRequestException(
            message=f"Số lượng thành viên tối thiểu ({min_v}) phải lớn hơn 0 và không vượt quá số lượng tối đa ({max_v})."
        )
    if body.get("status") is not None and body.get("currentPhase") is None:
        metadata["currentPhase"] = _PHASE_LABELS.get(str(body["status"]), str(body["status"]))
    if body.get("currentPhase") is not None and body.get("status") is None:
        phase_statuses = {label: status for status, label in _PHASE_LABELS.items()}
        phase_statuses.update({
            "Đăng ký tài khoản & Lập đội": "registration",
            "Lựa chọn đề tài & Giới hạn số lượng": "team_formation",
            "Thực thi dự án & Nộp bài các chặng": "hacking",
            "Hội đồng chấm thi độc lập": "judging",
            "Bế mạc & Công bố kết quả": "completed",
        })
        phase = str(body["currentPhase"])
        if phase in phase_statuses:
            metadata["status"] = phase_statuses[phase]
    cfg.settings_data = metadata

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


@public_router.get("/config", response_model=ApiResponse[Dict[str, Any]])
async def get_public_config(db: AsyncSession = Depends(get_db)):
    cfg = await _get_or_create_hackathon_config(db)
    return success_response(data=_serialize_hackathon_config(cfg), message="Cấu hình cuộc thi.")
