import json
import uuid
from datetime import UTC, datetime
from typing import Any

from aio_pika import DeliveryMode, ExchangeType, Message, connect_robust
from aio_pika.abc import AbstractRobustConnection, AbstractRobustExchange


class EventPublisher:
    def __init__(self, rabbitmq_url: str):
        self.rabbitmq_url = rabbitmq_url
        self.connection: AbstractRobustConnection | None = None
        self.exchange: AbstractRobustExchange | None = None

    @property
    def is_connected(self) -> bool:
        return bool(self.connection and not self.connection.is_closed)

    async def connect(self) -> None:
        self.connection = await connect_robust(self.rabbitmq_url, client_properties={"connection_name": "auth-service"})
        channel = await self.connection.channel(publisher_confirms=True)
        self.exchange = await channel.declare_exchange("sabr.events", ExchangeType.TOPIC, durable=True)

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        if self.exchange is None:
            raise RuntimeError("RabbitMQ publisher is not connected")
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "occurred_at": datetime.now(UTC).isoformat(),
            "version": 1,
            "payload": payload,
        }
        await self.exchange.publish(
            Message(
                body=json.dumps(event, ensure_ascii=False).encode(),
                content_type="application/json",
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=event["event_id"],
                type=event_type,
            ),
            routing_key=event_type,
        )

    async def close(self) -> None:
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
