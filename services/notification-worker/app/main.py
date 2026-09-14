import asyncio
import json
import logging

from aio_pika import ExchangeType, connect_robust
from aio_pika.abc import AbstractIncomingMessage
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"
    sms_provider: str = "mock"

    model_config = SettingsConfigDict(extra="ignore")


settings = Settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notification-worker")


async def process_message(message: AbstractIncomingMessage) -> None:
    async with message.process(requeue=False):
        event = json.loads(message.body)
        payload = event["payload"]
        if settings.sms_provider != "mock":
            raise RuntimeError(f"SMS provider {settings.sms_provider!r} is not configured")
        logger.info(
            "[MOCK SMS] phone=%s code=%s expires_in=%ss event_id=%s",
            payload["phone"],
            payload["code"],
            payload["expires_in_seconds"],
            event["event_id"],
        )


async def main() -> None:
    connection = await connect_robust(settings.rabbitmq_url, client_properties={"connection_name": "notification-worker"})
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=20)
        exchange = await channel.declare_exchange("sabr.events", ExchangeType.TOPIC, durable=True)
        queue = await channel.declare_queue("notifications.sms", durable=True)
        await queue.bind(exchange, routing_key="auth.sms_code_requested")
        await queue.consume(process_message)
        logger.info("Notification worker is ready")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
