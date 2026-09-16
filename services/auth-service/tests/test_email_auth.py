import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.auth import RequestCodeRequest, VerifyCodeRequest
from app.services.email import InvalidEmailAddress, normalize_email
from app.services.otp import OtpService


def test_normalizes_email_case_and_whitespace() -> None:
    assert normalize_email("  Customer@Example.COM ") == "customer@example.com"


def test_rejects_invalid_email() -> None:
    with pytest.raises(InvalidEmailAddress):
        normalize_email("not-an-email")


def test_auth_contract_uses_email() -> None:
    request = RequestCodeRequest.model_validate({"email": "Customer@Example.com"})
    verify = VerifyCodeRequest.model_validate({"email": "customer@example.com", "code": "123456"})

    assert str(request.email) == "Customer@example.com"
    assert str(verify.email) == "customer@example.com"

    with pytest.raises(ValidationError):
        RequestCodeRequest.model_validate({"phone": "+79990000000"})


def test_redis_key_does_not_expose_email_address() -> None:
    service = OtpService(redis=None, settings=Settings())  # type: ignore[arg-type]
    key = service._key("code", "customer@example.com")

    assert key.startswith("auth:otp:code:")
    assert "customer@example.com" not in key
