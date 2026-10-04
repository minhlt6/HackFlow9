from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, example, health, teams, topics

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(example.router)

# Sprint 1 modules
api_router.include_router(auth.router, prefix="/auth", tags=["Auth (HF-19)"])
api_router.include_router(admin.router, prefix="", tags=["Admin"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams (HF-20)"])
api_router.include_router(topics.router, prefix="/topics", tags=["Topics (HF-21)"])
