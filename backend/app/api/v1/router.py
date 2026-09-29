from fastapi import APIRouter

from app.api.v1.endpoints import health, example

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(example.router)

# Mount points for future sprints:
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth (HF-19)"])
# api_router.include_router(teams.router, prefix="/teams", tags=["Teams (HF-20)"])
# api_router.include_router(topics.router, prefix="/topics", tags=["Topics (HF-21)"])
