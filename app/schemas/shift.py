from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lyd import LydAmount


class ShiftOpen(BaseModel):
    opening_cash_lyd: Decimal = Field(ge=0)


class ShiftClose(BaseModel):
    closing_cash_lyd: Decimal = Field(ge=0)


class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cashier_id: int
    status: str
    opening_cash_lyd: LydAmount
    closing_cash_lyd: LydAmount | None
    opened_at: datetime
    closed_at: datetime | None
