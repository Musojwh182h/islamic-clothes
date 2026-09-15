from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CustomerOrderSummary(BaseModel):
    id: UUID
    number: str
    status: str
    payment_status: str
    total_kopecks: int
    currency: str
    item_count: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class CustomerOrderPage(BaseModel):
    items: list[CustomerOrderSummary]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(gt=0)


class CustomerOrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    sku: str
    product_name: str
    size: str
    unit_price_kopecks: int
    quantity: int
    line_total_kopecks: int


class CustomerOrderHistoryResponse(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    created_at: datetime


class CustomerOrderResponse(BaseModel):
    id: UUID
    number: str
    status: str
    payment_status: str
    recipient_name: str
    delivery_method: str
    delivery_address: dict[str, Any]
    currency: str
    subtotal_kopecks: int
    delivery_kopecks: int
    total_kopecks: int
    items: list[CustomerOrderItemResponse]
    history: list[CustomerOrderHistoryResponse]
    created_at: datetime
    updated_at: datetime
