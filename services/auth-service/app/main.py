from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import engine
from app.services.events import EventPublisher

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    publisher = EventPublisher(settings.rabbitmq_url)
    await redis_client.ping()
    await publisher.connect()
    app.state.redis = redis_client
    app.state.publisher = publisher
    try:
        yield
    finally:
        await publisher.close()
        await redis_client.aclose()
        await engine.dispose()


app = FastAPI(
    title="SABR Auth Service",
    version="0.2.0",
    description="Регистрация и вход по одноразовому SMS-коду.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    await app.state.redis.ping()
    return {
        "status": "ok",
        "service": "auth",
        "database": "ok",
        "redis": "ok",
        "rabbitmq": "ok" if app.state.publisher.is_connected else "down",
    }
