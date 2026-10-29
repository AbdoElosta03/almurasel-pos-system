from datetime import date

from pydantic import BaseModel

from app.schemas.lyd import LydAmount


class WeeklySalesDay(BaseModel):
    weekday: int
    label: str
    total_lyd: LydAmount
    count: int


class WeeklySalesInsights(BaseModel):
    best_days: list[str]
    hour_from: int | None
    hour_to: int | None
    summary: str


class WeeklySales(BaseModel):
    week_start: date
    week_end: date
    week_offset: int
    days: list[WeeklySalesDay]
    insights: WeeklySalesInsights


class DailyProductSalesItem(BaseModel):
    product_id: int
    product_name: str
    qty: int
    total_lyd: LydAmount


class DailyProductSales(BaseModel):
    date: date
    day_offset: int
    items: list[DailyProductSalesItem]
    total_qty: int
