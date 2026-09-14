from fastapi import APIRouter

from app.api.v1.catalog import router as catalog_router

api_router = APIRouter()
api_router.include_router(catalog_router)
