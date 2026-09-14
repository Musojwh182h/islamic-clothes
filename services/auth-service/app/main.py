from fastapi import FastAPI

app = FastAPI(
    title="SABR Auth Service",
    version="0.1.0",
    description="Изолированный сервис регистрации и входа по номеру телефона.",
)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "auth"}
