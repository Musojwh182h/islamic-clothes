from uuid import UUID

from pydantic import BaseModel, Field


class ProductVariantResponse(BaseModel):
    id: UUID
    sku: str
    size: str
    stock_quantity: int = Field(ge=0)


class ProductPreview(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str
    category: str
    price_kopecks: int = Field(ge=0, description="Цена в копейках")
    color: str
    material: str
    tone: str
    sizes: list[str]
    variants: list[ProductVariantResponse]
    image: str
    is_new: bool = False
