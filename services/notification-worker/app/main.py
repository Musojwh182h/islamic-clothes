import asyncio
import json
import logging
from functools import partial

import httpx
from aio_pika import ExchangeType, connect_robust
from aio_pika.abc import AbstractIncomingMessage
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"
    email_provider: str = "mock"
    resend_api_key: SecretStr | None = None
    email_from: str = ""
    resend_api_url: str = "https://api.resend.com/emails"

    model_config = SettingsConfigDict(extra="ignore")


settings = Settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notification-worker")


async def send_email(client: httpx.AsyncClient, event: dict) -> None:
    payload = event["payload"]
    if settings.email_provider == "mock":
        logger.info(
            "[MOCK EMAIL] email=%s code=%s expires_in=%ss event_id=%s",
            payload["email"],
            payload["code"],
            payload["expires_in_seconds"],
            event["event_id"],
        )
        return
    if settings.email_provider != "resend":
        raise RuntimeError(f"Email provider {settings.email_provider!r} is not configured")

    api_key = settings.resend_api_key.get_secret_value() if settings.resend_api_key else ""
    if not api_key or not settings.email_from:
        raise RuntimeError("RESEND_API_KEY and EMAIL_FROM are required for the Resend provider")

    code = payload["code"]
    expires_minutes = max(1, int(payload["expires_in_seconds"]) // 60)
    response = await client.post(
        settings.resend_api_url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Idempotency-Key": event["event_id"],
            "User-Agent": "SABR-Notification-Worker/1.0",
        },
        json={
            "from": settings.email_from,
            "to": [payload["email"]],
            "subject": "Код входа в SABR",
            "text": f"Ваш код входа в SABR: {code}. Код действует {expires_minutes} минут.",
            "html": (
                "<div style=\"font-family:Arial,sans-serif;color:#172117;max-width:520px\">"
                "<h1 style=\"font-size:24px\">Вход в SABR</h1>"
                "<p>Используйте этот одноразовый код:</p>"
                f"<p style=\"font-size:32px;font-weight:700;letter-spacing:8px\">{code}</p>"
                f"<p>Код действует {expires_minutes} минут. Никому его не сообщайте.</p>"
                "</div>"
            ),
        },
    )
    response.raise_for_status()
    logger.info("Email sent resend_id=%s event_id=%s", response.json().get("id"), event["event_id"])


async def process_message(message: AbstractIncomingMessage, client: httpx.AsyncClient) -> None:
    async with message.process(requeue=False):
        event = json.loads(message.body)
        if event.get("event_type") != "auth.email_code_requested":
            raise RuntimeError("Unsupported notification event")
        await send_email(client, event)


async def main() -> None:
    connection = await connect_robust(settings.rabbitmq_url, client_properties={"connection_name": "notification-worker"})
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=20)
        exchange = await channel.declare_exchange("sabr.events", ExchangeType.TOPIC, durable=True)
        dead_letter_exchange = await channel.declare_exchange("sabr.events.dlx", ExchangeType.DIRECT, durable=True)
        dead_letter_queue = await channel.declare_queue("notifications.email.failed", durable=True)
        await dead_letter_queue.bind(dead_letter_exchange, routing_key="notifications.email.failed")
        queue = await channel.declare_queue(
            "notifications.email",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "sabr.events.dlx",
                "x-dead-letter-routing-key": "notifications.email.failed",
            },
        )
        await queue.bind(exchange, routing_key="auth.email_code_requested")
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            await queue.consume(partial(process_message, client=client))
            logger.info("Notification worker is ready provider=%s", settings.email_provider)
            await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
