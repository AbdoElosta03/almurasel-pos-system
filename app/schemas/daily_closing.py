from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.lyd import LydAmount

DailyClosingResult = Literal["open", "pending", "surplus", "deficit", "match"]


class DailyClosingIn(BaseModel):
    counted_cash_lyd: Decimal = Field(ge=0)


class DailyClosingOut(BaseModel):
    shift_id: int
    cashier_id: int
    cashier_username: str
    status: str
    opened_at: datetime
    closed_at: datetime | None
    opening_cash_lyd: LydAmount
    closing_cash_lyd: LydAmount | None
    sales_total_lyd: LydAmount
    cash_sales_lyd: LydAmount
    card_sales_lyd: LydAmount
    expected_drawer_lyd: LydAmount
    counted_cash_lyd: LydAmount | None
    variance_lyd: LydAmount | None
    result: DailyClosingResult
    reconciled_at: datetime | None


class DailyClosingList(BaseModel):
    date: date
    items: list[DailyClosingOut]
