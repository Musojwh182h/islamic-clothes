from decimal import Decimal

from pydantic import BaseModel, Field


class ProductPreview(BaseModel):
    id: int
    slug: str
    name: str
    category: str
    price: Decimal = Field(description="Цена в рублях")
    sizes: list[str]
    image: str
    is_new: bool = False
