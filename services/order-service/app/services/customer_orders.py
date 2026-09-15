from app.models.order import Order
from app.schemas.customer import (
    CustomerOrderHistoryResponse,
    CustomerOrderItemResponse,
    CustomerOrderResponse,
    CustomerOrderSummary,
)


def to_customer_order_summary(order: Order) -> CustomerOrderSummary:
    return CustomerOrderSummary(
        id=order.id,
        number=order.number,
        status=order.status,
        payment_status=order.payment_status,
        total_kopecks=order.total_kopecks,
        currency=order.currency,
        item_count=sum(item.quantity for item in order.items),
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def to_customer_order(order: Order) -> CustomerOrderResponse:
    return CustomerOrderResponse(
        id=order.id,
        number=order.number,
        status=order.status,
        payment_status=order.payment_status,
        recipient_name=order.recipient_name,
        delivery_method=order.delivery_method,
        delivery_address=order.delivery_address,
        currency=order.currency,
        subtotal_kopecks=order.subtotal_kopecks,
        delivery_kopecks=order.delivery_kopecks,
        total_kopecks=order.total_kopecks,
        items=[
            CustomerOrderItemResponse(
                id=item.id,
                product_id=item.product_id,
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
            CustomerOrderHistoryResponse(
                id=entry.id,
                from_status=entry.from_status,
                to_status=entry.to_status,
                created_at=entry.created_at,
            )
            for entry in sorted(order.history, key=lambda value: value.created_at)
        ],
        created_at=order.created_at,
        updated_at=order.updated_at,
    )
