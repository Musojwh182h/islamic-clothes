from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import engine
from app.services.admin_auth import AdminAuthorizer

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    auth_client = httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0))
    app.state.admin_authorizer = AdminAuthorizer(auth_client, settings.auth_me_url)
    try:
        yield
    finally:
        await auth_client.aclose()
        await engine.dispose()


app = FastAPI(
    title="SABR Orders Service",
    version="0.2.0",
    description="Изолированный сервис корзины, заказов и платежей.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok", "service": "orders", "database": "ok"}
