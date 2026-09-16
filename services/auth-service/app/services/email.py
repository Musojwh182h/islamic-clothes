from pydantic import EmailStr, TypeAdapter, ValidationError

EMAIL_ADAPTER = TypeAdapter(EmailStr)


class InvalidEmailAddress(ValueError):
    pass


def normalize_email(value: str | EmailStr) -> str:
    try:
        return str(EMAIL_ADAPTER.validate_python(value)).strip().lower()
    except ValidationError as exc:
        raise InvalidEmailAddress("Укажите корректный адрес электронной почты") from exc
