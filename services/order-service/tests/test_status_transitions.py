import pytest

from app.services.admin_orders import OrderConflict, ensure_status_transition, payment_status_after_order_transition


@pytest.mark.parametrize(
    ("current", "target"),
    [
        ("new", "confirmed"),
        ("new", "cancelled"),
        ("confirmed", "assembling"),
        ("assembling", "shipped"),
        ("shipped", "delivered"),
    ],
)
def test_allows_valid_status_transition(current: str, target: str) -> None:
    ensure_status_transition(current, target)


@pytest.mark.parametrize(
    ("current", "target"),
    [("new", "delivered"), ("shipped", "cancelled"), ("delivered", "new"), ("cancelled", "confirmed")],
)
def test_rejects_invalid_status_transition(current: str, target: str) -> None:
    with pytest.raises(OrderConflict):
        ensure_status_transition(current, target)


@pytest.mark.parametrize("payment_status", ["pending", "waiting"])
def test_cancelling_unpaid_order_cancels_payment(payment_status: str) -> None:
    assert payment_status_after_order_transition(payment_status, "cancelled") == "cancelled"


def test_cancelling_paid_order_does_not_hide_payment() -> None:
    assert payment_status_after_order_transition("paid", "cancelled") == "paid"
