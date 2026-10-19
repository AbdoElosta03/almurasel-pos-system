from datetime import datetime

from pydantic import BaseModel

from app.schemas.lyd import LydAmount
from app.schemas.sale import SaleOut


class ReportSummary(BaseModel):
    count: int
    total_lyd: LydAmount
    cash_lyd: LydAmount
    card_lyd: LydAmount


class SalesReportSummary(BaseModel):
    count: int
    total_lyd: LydAmount
    cash_lyd: LydAmount
    card_lyd: LydAmount
    cancelled_count: int
    cancelled_lyd: LydAmount


class SalesReportItem(BaseModel):
    id: int
    created_at: datetime
    cashier_id: int
    cashier_username: str
    shift_id: int
    payment_method: str
    status: str
    total_lyd: LydAmount
    cancelled_at: datetime | None
    cancelled_by: int | None
    cancelled_by_username: str | None


class SalesReport(BaseModel):
    summary: SalesReportSummary
    items: list[SalesReportItem]
    page: int
    page_size: int
    total: int


class SaleDetail(SaleOut):
    cashier_username: str
    cancelled_by_username: str | None
