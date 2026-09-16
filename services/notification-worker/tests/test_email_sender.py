import asyncio
from unittest.mock import AsyncMock, MagicMock

from pydantic import SecretStr

from app.main import send_email, settings

EVENT = {
    "event_id": "9997f987-b82f-4678-b5c4-3d2188a60db0",
    "event_type": "auth.email_code_requested",
    "payload": {
        "email": "customer@example.com",
        "code": "123456",
        "expires_in_seconds": 300,
    },
}


def test_mock_provider_does_not_call_external_api(monkeypatch) -> None:
    monkeypatch.setattr(settings, "email_provider", "mock")
    client = MagicMock()
    client.post = AsyncMock()

    asyncio.run(send_email(client, EVENT))

    client.post.assert_not_awaited()


def test_resend_request_has_restricted_payload_and_idempotency(monkeypatch) -> None:
    monkeypatch.setattr(settings, "email_provider", "resend")
    monkeypatch.setattr(settings, "resend_api_key", SecretStr("re_test_only"))
    monkeypatch.setattr(settings, "email_from", "SABR <login@example.com>")
    response = MagicMock()
    response.json.return_value = {"id": "email-id"}
    client = MagicMock()
    client.post = AsyncMock(return_value=response)

    asyncio.run(send_email(client, EVENT))

    _, kwargs = client.post.await_args
    assert kwargs["headers"]["Authorization"] == "Bearer re_test_only"
    assert kwargs["headers"]["Idempotency-Key"] == EVENT["event_id"]
    assert kwargs["json"]["from"] == "SABR <login@example.com>"
    assert kwargs["json"]["to"] == ["customer@example.com"]
    assert "123456" in kwargs["json"]["text"]
    response.raise_for_status.assert_called_once()
