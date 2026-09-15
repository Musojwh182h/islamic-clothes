from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CheckoutItem(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    product_id: UUID
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)
    size: str = Field(min_length=1, max_length=16)
    quantity: int = Field(ge=1, le=100)


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    recipient_name: str = Field(min_length=2, max_length=180)
    phone: str = Field(min_length=10, max_length=24)
    city: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=5, max_length=500)
    items: list[CheckoutItem] = Field(min_length=1, max_length=50)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        digits = "".join(c for c in value if c in "0123456789")
        if len(digits) == 11 and digits[0] == "8":
            digits = "7" + digits[1:]
        if len(digits) != 11 or not digits.startswith("7"):
            raise ValueError("Введите российский номер телефона: +7 и 10 цифр")
        return "+" + digits

    @model_validator(mode="after")
    def unique_items(self):
        keys = [(item.product_id, item.size) for item in self.items]
        if len(keys) != len(set(keys)):
            raise ValueError("Объедините одинаковые товары и размеры в одну позицию")
        return self


class CheckoutResponse(BaseModel):
    id: UUID
    number: str
    status: str
    total_kopecks: int
