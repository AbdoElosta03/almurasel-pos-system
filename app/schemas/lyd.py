from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer


def _serialize_lyd(value: Decimal) -> float:
    return float(value)


LydAmount = Annotated[
    Decimal,
    PlainSerializer(_serialize_lyd, return_type=float, when_used='json'),
]
