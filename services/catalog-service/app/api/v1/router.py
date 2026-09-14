from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.catalog import router as catalog_router

api_router = APIRouter()
api_router.include_router(catalog_router)
api_router.include_router(admin_router)
