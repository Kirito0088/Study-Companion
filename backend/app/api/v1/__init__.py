"""v1 API router aggregator."""

from fastapi import APIRouter
from app.api.v1.routers import dashboard, planner, assignments, chat

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(dashboard.router)
api_router.include_router(planner.router)
api_router.include_router(assignments.router)
api_router.include_router(chat.router)
