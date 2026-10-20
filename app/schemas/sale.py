from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lyd import LydAmount


class SaleItemIn(BaseModel):
    product_id: int
    qty: int = Field(gt=0)


class SaleCreate(BaseModel):
    payment_method: str = Field(pattern="^(cash|card)$")
    items: list[SaleItemIn] = Field(min_length=1)


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    unit_price_lyd: LydAmount
    qty: int
    line_total_lyd: LydAmount


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shift_id: int
    cashier_id: int
    payment_method: str
    status: str
    total_lyd: LydAmount
    created_at: datetime
    cancelled_at: datetime | None
    cancelled_by: int | None
    items: list[SaleItemOut]


class OpenShiftSalesSummary(BaseModel):
    invoice_count: int
    cash_lyd: LydAmount
    card_lyd: LydAmount


class SaleSummary(BaseModel):
    id: int
    payment_method: str
    status: str
    total_lyd: LydAmount
    created_at: datetime
    item_count: int


class SalePage(BaseModel):
    summary: OpenShiftSalesSummary
    items: list[SaleSummary]
    page: int
    page_size: int
    total: int
