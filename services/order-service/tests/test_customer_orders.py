from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from app.services.customer_orders import to_customer_order, to_customer_order_summary


def customer_order_fixture():
    now = datetime.now(UTC)
    item = SimpleNamespace(
        id=uuid4(),
        product_id=uuid4(),
        variant_id=uuid4(),
        sku="KANDURA-SAND-M",
        product_name="Кандура «Песок»",
        size="M",
        unit_price_kopecks=649000,
        quantity=2,
        line_total_kopecks=1298000,
    )
    history = SimpleNamespace(
        id=uuid4(),
        from_status=None,
        to_status="new",
        actor_user_id=uuid4(),
        comment="Внутренний комментарий администратора",
        created_at=now,
    )
    payment = SimpleNamespace(
        provider="internal-provider",
        provider_payment_id="secret-provider-reference",
    )
    return SimpleNamespace(
        id=uuid4(),
        number="SABR-TEST",
        user_id=uuid4(),
        status="new",
        payment_status="pending",
        recipient_name="Покупатель",
        customer_phone="+79990000000",
        delivery_method="courier",
        delivery_address={"city": "Москва", "address": "Улица, дом 1"},
        currency="RUB",
        subtotal_kopecks=1298000,
        delivery_kopecks=0,
        total_kopecks=1298000,
        items=[item],
        history=[history],
        payments=[payment],
        created_at=now,
        updated_at=now,
    )


def test_customer_summary_counts_units() -> None:
    summary = to_customer_order_summary(customer_order_fixture())

    assert summary.item_count == 2
    assert summary.total_kopecks == 1298000


def test_customer_order_hides_internal_data() -> None:
    response = to_customer_order(customer_order_fixture()).model_dump(mode="json")

    assert "user_id" not in response
    assert "customer_phone" not in response
    assert "payments" not in response
    assert "variant_id" not in response["items"][0]
    assert "actor_user_id" not in response["history"][0]
    assert "comment" not in response["history"][0]
