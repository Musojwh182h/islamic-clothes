from fastapi import APIRouter

from app.api.v1.media import router as media_router

api_router = APIRouter()
api_router.include_router(media_router)
