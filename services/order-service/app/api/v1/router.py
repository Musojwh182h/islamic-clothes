from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.checkout import router as checkout_router

api_router = APIRouter()
api_router.include_router(admin_router)
api_router.include_router(checkout_router)
