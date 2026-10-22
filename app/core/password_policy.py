import re

from fastapi import status

from app.core.errors import api_error

PIN_MIN_LENGTH = 4
PIN_MAX_LENGTH = 32
_NUMERIC_PIN = re.compile(rf"^\d{{{PIN_MIN_LENGTH},{PIN_MAX_LENGTH}}}$")


def assert_numeric_pin(password: str) -> None:
    if _NUMERIC_PIN.fullmatch(password):
        return
    raise api_error(
        status.HTTP_400_BAD_REQUEST,
        "password_must_be_numeric",
        "Password must contain digits only (4–32 digits)",
    )
