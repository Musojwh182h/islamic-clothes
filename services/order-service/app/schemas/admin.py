from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

OrderStatus = Literal["new", "confirmed", "assembling", "shipped", "delivered", "cancelled"]


class AdminOrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    variant_id: UUID
    sku: str
    product_name: str
    size: str
    unit_price_kopecks: int
    quantity: int
    line_total_kopecks: int


class AdminOrderHistoryResponse(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    actor_user_id: UUID | None
    comment: str
    created_at: datetime


class AdminPaymentResponse(BaseModel):
    id: UUID
    provider: str
    provider_payment_id: str | None
    status: str
    amount_kopecks: int
    currency: str
    created_at: datetime
    updated_at: datetime


class AdminOrderResponse(BaseModel):
    id: UUID
    number: str
    user_id: UUID
    status: str
    payment_status: str
    recipient_name: str
    customer_phone: str
    delivery_method: str
    delivery_address: dict[str, Any]
    currency: str
    subtotal_kopecks: int
    delivery_kopecks: int
    total_kopecks: int
    items: list[AdminOrderItemResponse]
    history: list[AdminOrderHistoryResponse]
    payments: list[AdminPaymentResponse]
    created_at: datetime
    updated_at: datetime


class AdminOrderPage(BaseModel):
    items: list[AdminOrderResponse]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(gt=0)


class AdminOrderStatusUpdate(BaseModel):
    status: OrderStatus
    comment: str = Field(default="", max_length=1000)
    expected_updated_at: datetime | None = None
