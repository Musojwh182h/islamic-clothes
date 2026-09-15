import hashlib
import json
import uuid

import httpx
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatusHistory
from app.schemas.checkout import CheckoutRequest, CheckoutResponse


async def create_order(session: AsyncSession, client: httpx.AsyncClient, catalog_url: str,
                       user_id: uuid.UUID, key: uuid.UUID, body: CheckoutRequest) -> CheckoutResponse:
    request_key = f"{user_id}:{key}"
    lock_key = int.from_bytes(hashlib.sha256(request_key.encode()).digest()[:8], "big", signed=True)
    await session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})
    existing = await session.scalar(select(Order).where(Order.idempotency_key == request_key))
    fingerprint = hashlib.sha256(json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()
    if existing:
        if existing.request_fingerprint != fingerprint:
            raise HTTPException(409, "Этот запрос уже использован для другого заказа. Обновите оформление")
        return CheckoutResponse(id=existing.id, number=existing.number, status=existing.status, total_kopecks=existing.total_kopecks)

    items = []
    for requested in body.items:
        try:
            response = await client.get(f"{catalog_url.rstrip('/')}/products/{requested.slug}")
        except httpx.RequestError as exc:
            raise HTTPException(503, "Каталог временно недоступен. Корзина сохранена, попробуйте снова") from exc
        if response.status_code == 404:
            raise HTTPException(409, "Один из товаров больше недоступен. Обновите корзину")
        if response.status_code != 200:
            raise HTTPException(503, "Не удалось проверить каталог. Попробуйте снова")
        product = response.json()
        variant = next((v for v in product["variants"] if v["size"] == requested.size), None)
        if product["id"] != str(requested.product_id) or not variant or variant["stock_quantity"] < requested.quantity:
            raise HTTPException(409, f"{product['name']}: выбранный размер или количество недоступны")
        items.append(OrderItem(product_id=requested.product_id, variant_id=uuid.UUID(variant["id"]),
                               sku=variant["sku"], product_name=product["name"], size=variant["size"],
                               unit_price_kopecks=product["price_kopecks"], quantity=requested.quantity,
                               line_total_kopecks=product["price_kopecks"] * requested.quantity))
    total = sum(item.line_total_kopecks for item in items)
    if total > 2_000_000_000:
        raise HTTPException(422, "Сумма заказа превышает допустимую")
    order_id = uuid.uuid4()
    order = Order(id=order_id, number=f"SABR-{order_id.hex[:20].upper()}", user_id=user_id,
                  recipient_name=body.recipient_name, customer_phone=body.phone,
                  delivery_method="courier", delivery_address={"city": body.city, "address": body.address},
                  request_fingerprint=fingerprint, subtotal_kopecks=total, total_kopecks=total,
                  delivery_kopecks=0, status="new", payment_status="pending", currency="RUB",
                  idempotency_key=request_key, items=items,
                  history=[OrderStatusHistory(to_status="new", actor_user_id=user_id,
                            comment="Получен с витрины. Требуется подтверждение наличия и доставки")])
    session.add(order)
    await session.commit()
    return CheckoutResponse(id=order.id, number=order.number, status=order.status, total_kopecks=total)
