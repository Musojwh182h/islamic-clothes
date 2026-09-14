from fastapi import FastAPI

app = FastAPI(
    title="SABR Orders Service",
    version="0.1.0",
    description="Изолированный сервис корзины, заказа и статусов оплаты.",
)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "orders"}
