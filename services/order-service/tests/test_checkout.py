from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.checkout import CheckoutRequest


def valid_payload() -> dict:
    return {
        "recipient_name": "Тестовый Покупатель",
        "phone": "+7 999 111-22-33",
        "city": "Москва",
        "address": "Тестовая улица, дом 1",
        "items": [{
            "product_id": str(uuid4()),
            "slug": "test-product",
            "size": "M",
            "quantity": 1,
        }],
    }


def test_normalizes_russian_phone() -> None:
    payload = valid_payload()
    payload["phone"] = "8 (999) 111-22-33"

    assert CheckoutRequest.model_validate(payload).phone == "+79991112233"


def test_rejects_duplicate_product_size() -> None:
    payload = valid_payload()
    payload["items"].append(payload["items"][0].copy())

    with pytest.raises(ValidationError, match="Объедините одинаковые товары"):
        CheckoutRequest.model_validate(payload)


def test_rejects_client_supplied_price() -> None:
    payload = valid_payload()
    payload["items"][0]["price_kopecks"] = 1

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        CheckoutRequest.model_validate(payload)


def test_rejects_invalid_slug_and_quantity() -> None:
    payload = valid_payload()
    payload["items"][0].update(slug="Русский адрес", quantity=0)

    with pytest.raises(ValidationError):
        CheckoutRequest.model_validate(payload)
