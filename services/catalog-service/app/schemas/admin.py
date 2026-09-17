from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AdminProductVariantWrite(BaseModel):
    id: UUID | None = None
    sku: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]+$")
    size: str = Field(min_length=1, max_length=16)
    stock_quantity: int = Field(ge=0, le=1_000_000)
    sort_order: int = Field(default=0, ge=0, le=10_000)
    is_active: bool = True

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("size")
    @classmethod
    def normalize_size(cls, value: str) -> str:
        return value.strip().upper()


class AdminProductImageWrite(BaseModel):
    id: UUID | None = None
    object_key: str = Field(min_length=10, max_length=512, pattern=r"^products/[A-Za-z0-9/_-]+\.(png|jpe?g|webp)$")
    alt_text: str = Field(default="", max_length=240)
    sort_order: int = Field(default=0, ge=0, le=10_000)


class AdminProductPayload(BaseModel):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)
    category: str = Field(min_length=2, max_length=80)
    price_kopecks: int = Field(ge=0, le=2_000_000_000)
    color: str = Field(default="", max_length=80)
    material: str = Field(default="", max_length=160)
    tone: str = Field(default="sand", min_length=2, max_length=32)
    is_active: bool = True
    is_new: bool = False
    variants: list[AdminProductVariantWrite] = Field(min_length=1, max_length=100)
    images: list[AdminProductImageWrite] = Field(default_factory=list, max_length=12)

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("name", "category", "color", "material", "tone")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_collections(self):
        skus = [variant.sku for variant in self.variants]
        sizes = [variant.size for variant in self.variants]
        image_keys = [image.object_key for image in self.images]
        if len(skus) != len(set(skus)):
            raise ValueError("SKU вариантов не должны повторяться")
        if len(sizes) != len(set(sizes)):
            raise ValueError("Размеры вариантов не должны повторяться")
        if len(image_keys) != len(set(image_keys)):
            raise ValueError("Изображения не должны повторяться")
        return self


class AdminProductCreate(AdminProductPayload):
    pass


class AdminProductUpdate(AdminProductPayload):
    expected_updated_at: datetime | None = None


class AdminStockUpdate(BaseModel):
    stock_quantity: int = Field(ge=0, le=1_000_000)


class AdminProductVisibilityUpdate(BaseModel):
    is_active: bool
    expected_updated_at: datetime | None = None


class AdminCategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())


class AdminCategoryResponse(BaseModel):
    id: UUID
    name: str
    is_active: bool
    created_at: datetime


class AdminProductVariantResponse(BaseModel):
    id: UUID
    sku: str
    size: str
    stock_quantity: int
    sort_order: int
    is_active: bool


class AdminProductImageResponse(BaseModel):
    id: UUID
    object_key: str
    url: str
    alt_text: str
    sort_order: int


class AdminProductResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str
    category: str
    price_kopecks: int
    color: str
    material: str
    tone: str
    is_active: bool
    is_new: bool
    variants: list[AdminProductVariantResponse]
    images: list[AdminProductImageResponse]
    created_at: datetime
    updated_at: datetime


class AdminProductPage(BaseModel):
    items: list[AdminProductResponse]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(gt=0)
