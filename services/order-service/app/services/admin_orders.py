import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatusHistory
from app.repositories.orders import OrderRepository
from app.schemas.admin import (
    AdminOrderHistoryResponse,
    AdminOrderItemResponse,
    AdminOrderResponse,
    AdminOrderStatusUpdate,
    AdminPaymentResponse,
)

ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "new": {"confirmed", "cancelled"},
    "confirmed": {"assembling", "cancelled"},
    "assembling": {"shipped", "cancelled"},
    "shipped": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}


class OrderNotFound(ValueError):
    pass


class OrderConflict(ValueError):
    pass


def ensure_status_transition(current: str, target: str) -> None:
    if target not in ALLOWED_STATUS_TRANSITIONS.get(current, set()):
        raise OrderConflict(f"Переход из статуса {current} в {target} запрещён")


def to_admin_order(order: Order) -> AdminOrderResponse:
    return AdminOrderResponse(
        id=order.id,
        number=order.number,
        user_id=order.user_id,
        status=order.status,
        payment_status=order.payment_status,
        recipient_name=order.recipient_name,
        customer_phone=order.customer_phone,
        delivery_method=order.delivery_method,
        delivery_address=order.delivery_address,
        currency=order.currency,
        subtotal_kopecks=order.subtotal_kopecks,
        delivery_kopecks=order.delivery_kopecks,
        total_kopecks=order.total_kopecks,
        items=[
            AdminOrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                sku=item.sku,
                product_name=item.product_name,
                size=item.size,
                unit_price_kopecks=item.unit_price_kopecks,
                quantity=item.quantity,
                line_total_kopecks=item.line_total_kopecks,
            )
            for item in order.items
        ],
        history=[
            AdminOrderHistoryResponse(
                id=entry.id,
                from_status=entry.from_status,
                to_status=entry.to_status,
                actor_user_id=entry.actor_user_id,
                comment=entry.comment,
                created_at=entry.created_at,
            )
            for entry in sorted(order.history, key=lambda value: value.created_at)
        ],
        payments=[
            AdminPaymentResponse(
                id=payment.id,
                provider=payment.provider,
                provider_payment_id=payment.provider_payment_id,
                status=payment.status,
                amount_kopecks=payment.amount_kopecks,
                currency=payment.currency,
                created_at=payment.created_at,
                updated_at=payment.updated_at,
            )
            for payment in order.payments
        ],
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


class OrderAdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = OrderRepository(session)

    async def update_status(
        self,
        order_id: uuid.UUID,
        body: AdminOrderStatusUpdate,
        actor_user_id: uuid.UUID,
    ) -> Order:
        order = await self.repository.get_admin_by_id(order_id, for_update=True)
        if order is None:
            raise OrderNotFound("Заказ не найден")
        if body.expected_updated_at and order.updated_at != body.expected_updated_at:
            raise OrderConflict("Заказ уже изменён другим администратором. Обновите данные")
        ensure_status_transition(order.status, body.status)
        previous = order.status
        order.status = body.status
        order.history.append(
            OrderStatusHistory(
                from_status=previous,
                to_status=body.status,
                actor_user_id=actor_user_id,
                comment=body.comment.strip(),
            )
        )
        await self.session.commit()
        refreshed = await self.repository.get_admin_by_id(order_id)
        if refreshed is None:
            raise OrderNotFound("Заказ не найден")
        return refreshed
