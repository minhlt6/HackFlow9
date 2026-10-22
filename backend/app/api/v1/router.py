from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    announcements,
    auth,
    checkpoints,
    evaluations,
    example,
    health,
    leaderboard,
    notifications,
    rubrics,
    submissions,
    teams,
    tickets,
    topics,
)

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(example.router)

# Sprint 1 modules
api_router.include_router(auth.router, prefix="/auth", tags=["Auth (HF-19)"])
api_router.include_router(auth.users_router, prefix="/users", tags=["Auth (HF-19)"])
api_router.include_router(admin.router, prefix="", tags=["Admin"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams (HF-20)"])
api_router.include_router(topics.router, prefix="/topics", tags=["Topics (HF-21)"])

# Sprint 2 & 3 modules
api_router.include_router(checkpoints.router, prefix="/checkpoints", tags=["Checkpoints (HF-32)"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["Submissions & Audit Log (HF-34)"])
api_router.include_router(announcements.router, prefix="/announcements", tags=["Announcements (HF-27)"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Support Tickets (HF-37)"])

# Sprint 4 modules
api_router.include_router(rubrics.router, prefix="/rubrics", tags=["Rubrics (HF-42)"])
api_router.include_router(
    evaluations.router, prefix="/evaluations", tags=["Evaluations & Blind Judging (HF-42)"]
)
api_router.include_router(
    evaluations.admin_evaluations_router,
    prefix="/admin/evaluations",
    tags=["Evaluations & Blind Judging (HF-42)"],
)
api_router.include_router(
    leaderboard.router, prefix="/leaderboard", tags=["Leaderboard & Results (HF-43)"]
)
api_router.include_router(
    leaderboard.admin_leaderboard_router,
    prefix="/admin/leaderboard",
    tags=["Leaderboard & Results (HF-43)"],
)
