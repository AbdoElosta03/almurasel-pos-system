from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.lyd import LydAmount

ExpenseCategory = Literal["wage", "supplier_payment", "other"]
ExpenseSource = Literal["drawer", "external"]


class ExpenseCreate(BaseModel):
    expense_date: date
    category: ExpenseCategory
    payee_name: str = Field(min_length=1, max_length=120)
    note: str | None = Field(default=None, max_length=240)
    amount_lyd: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    paid_from: ExpenseSource
    shift_id: int | None = Field(default=None, ge=1)

    @field_validator("payee_name")
    @classmethod
    def payee_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Payee name is required")
        return value

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ExpenseOut(BaseModel):
    id: int
    expense_date: date
    category: ExpenseCategory
    payee_name: str
    note: str | None
    amount_lyd: LydAmount
    paid_from: ExpenseSource
    shift_id: int | None
    shift_cashier_username: str | None
    created_by: int
    created_by_username: str
    created_at: datetime
    deletable: bool


class ExpenseList(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int
    total_lyd: LydAmount


class ExpensePeriods(BaseModel):
    day_lyd: LydAmount
    day_count: int
    week_lyd: LydAmount
    week_count: int
    month_lyd: LydAmount
    month_count: int


class DrawerShiftOption(BaseModel):
    shift_id: int
    cashier_username: str
    status: str
    opened_at: datetime


class CurrentDrawer(BaseModel):
    shift_id: int
    opening_cash_lyd: LydAmount
    cash_sales_lyd: LydAmount
    drawer_expenses_lyd: LydAmount
    expected_drawer_lyd: LydAmount
    items: list[ExpenseOut]
