import pytest
from datetime import datetime, timezone
from app.core.database import Base
from app.models import (
    User,
    UserRole,
    ApprovalStatus,
    Team,
    TeamMember,
    TeamMemberRole,
    Topic,
    Subtopic,
    Checkpoint,
    Submission,
    SubmissionStatus,
    RubricCriteria,
    Evaluation,
    SupportTicket,
    TicketStatus,
    TicketPriority,
    HackathonConfig,
)


def test_metadata_contains_all_11_tables():
    """
    Ensure all 10 core tables (+ hackathon_config) are registered on SQLAlchemy Base.metadata.
    """
    expected_tables = {
        "users",
        "teams",
        "team_members",
        "topics",
        "subtopics",
        "checkpoints",
        "submissions",
        "rubric_criteria",
        "evaluations",
        "support_tickets",
        "hackathon_config",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"


def test_user_model_defaults_and_constraints():
    """
    Test User model defaults: role=candidate, approval_status=pending, is_active=True.
    """
    user = User(
        email="participant@example.com",
        full_name="Nguyễn Văn A",
        github_id="gh_12345",
    )
    assert user.role == UserRole.CANDIDATE.value
    assert user.approval_status == ApprovalStatus.PENDING.value
    assert user.is_active is True
    assert user.email == "participant@example.com"
    assert user.id is not None
    assert len(user.id) == 36


def test_team_and_member_instantiation():
    """
    Test Team and TeamMember model instantiation and to_dict().
    """
    team = Team(
        team_name="CyberWarriors",
        invite_code="CW8901",
    )
    assert team.team_name == "CyberWarriors"
    assert team.invite_code == "CW8901"
    assert team.is_locked is False

    member = TeamMember(
        team_id=team.id,
        user_id="user-uuid-1",
        role=TeamMemberRole.LEADER.value,
    )
    assert member.role == "leader"
    assert member.team_id == team.id


def test_topic_and_subtopic_quotas():
    """
    Test Topic and Subtopic models with quotas and default counts.
    """
    topic = Topic(title="Fintech AI", max_teams=10)
    assert topic.max_teams == 10
    assert topic.current_teams == 0
    assert topic.is_active is True

    subtopic = Subtopic(topic_id=topic.id, title="Fraud Detection", max_teams=5)
    assert subtopic.max_teams == 5
    assert subtopic.current_teams == 0


def test_checkpoint_and_submission_model():
    """
    Test Checkpoint and Submission models capturing frozen commit SHA.
    """
    now = datetime.now(timezone.utc)
    checkpoint = Checkpoint(
        title="Checkpoint 1: Architecture & Repo Setup",
        start_time=now,
        deadline=now,
    )
    assert checkpoint.is_active is True

    submission = Submission(
        checkpoint_id=checkpoint.id,
        team_id="team-uuid-1",
        repo_url="https://github.com/team/hackflow",
        commit_sha="a1b2c3d4e5f67890123456789abcdef012345678",
    )
    assert submission.status == SubmissionStatus.SUBMITTED.value
    assert len(submission.commit_sha) == 40


def test_rubric_and_evaluation_model():
    """
    Test RubricCriteria and Evaluation models.
    """
    rubric = RubricCriteria(
        title="Code Quality & Clean Architecture",
        max_score=10.0,
        weight=1.5,
    )
    assert rubric.max_score == 10.0
    assert rubric.weight == 1.5

    evaluation = Evaluation(
        submission_id="sub-uuid-1",
        judge_id="judge-uuid-1",
        criteria_id=rubric.id,
        score=9.5,
        comment="Tuyệt vời, kiến trúc 3 tầng rất rõ ràng.",
    )
    assert evaluation.score == 9.5


def test_support_ticket_model():
    """
    Test SupportTicket model defaults.
    """
    ticket = SupportTicket(
        user_id="user-uuid-1",
        title="Lỗi khi push commit SHA",
        content="Em không nộp được bài dù repo public.",
    )
    assert ticket.status == TicketStatus.OPEN.value
    assert ticket.priority == TicketPriority.NORMAL.value
