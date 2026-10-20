from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator

from app.schemas.lyd import LydAmount

Quantity = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]


class PurchaseItemIn(BaseModel):
    item_name: str = Field(min_length=1, max_length=120)
    qty: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    line_total_lyd: Decimal = Field(ge=0, max_digits=12, decimal_places=3)

    @field_validator("item_name")
    @classmethod
    def name_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Item name is required")
        return value


class PurchaseCreate(BaseModel):
    purchase_date: date
    supplier_name: str | None = Field(default=None, max_length=120)
    items: list[PurchaseItemIn] = Field(min_length=1)

    @field_validator("supplier_name")
    @classmethod
    def clean_supplier(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class PurchaseItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_name: str
    qty: Quantity
    line_total_lyd: LydAmount


class PurchaseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_date: date
    supplier_name: str | None
    total_lyd: LydAmount
    created_by: int
    created_at: datetime


class PurchaseOut(PurchaseSummary):
    items: list[PurchaseItemOut]
