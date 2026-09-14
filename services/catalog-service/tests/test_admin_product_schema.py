import pytest
from pydantic import ValidationError

from app.schemas.admin import AdminProductCreate


def product_payload() -> dict:
    return {
        "slug": "classic-thobe",
        "name": "Classic thobe",
        "category": "Thobes",
        "price_kopecks": 899_000,
        "variants": [
            {
                "sku": "thobe-classic-m",
                "size": "m",
                "stock_quantity": 5,
            }
        ],
    }


def test_product_payload_normalizes_slug_sku_and_size() -> None:
    product = AdminProductCreate.model_validate(product_payload())

    assert product.slug == "classic-thobe"
    assert product.variants[0].sku == "THOBE-CLASSIC-M"
    assert product.variants[0].size == "M"


@pytest.mark.parametrize("duplicate_field", ["sku", "size"])
def test_product_payload_rejects_duplicate_variants(duplicate_field: str) -> None:
    payload = product_payload()
    duplicate = dict(payload["variants"][0])
    duplicate["sku"] = "THOBE-CLASSIC-L"
    duplicate["size"] = "L"
    duplicate[duplicate_field] = payload["variants"][0][duplicate_field]
    payload["variants"].append(duplicate)

    with pytest.raises(ValidationError):
        AdminProductCreate.model_validate(payload)


def test_product_payload_requires_at_least_one_variant() -> None:
    payload = product_payload()
    payload["variants"] = []

    with pytest.raises(ValidationError):
        AdminProductCreate.model_validate(payload)
