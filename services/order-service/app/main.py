from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.db.session import engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="SABR Orders Service",
    version="0.2.0",
    description="Изолированный сервис корзины, заказов и платежей.",
    lifespan=lifespan,
)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok", "service": "orders", "database": "ok"}
