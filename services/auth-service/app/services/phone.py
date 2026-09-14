import re


class InvalidPhoneNumber(ValueError):
    pass


def normalize_russian_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10 and digits.startswith("9"):
        digits = f"7{digits}"
    elif len(digits) == 11 and digits.startswith("8"):
        digits = f"7{digits[1:]}"

    if len(digits) != 11 or not digits.startswith("7"):
        raise InvalidPhoneNumber("Введите российский номер в формате +7 999 123-45-67")
    return f"+{digits}"
