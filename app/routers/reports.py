from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.config import settings
from app.utils.time import day_bounds
from app.db.session import get_db
from app.schemas.report import ReportSummary, SaleDetail, SalesReport
from app.schemas.statistics import DailyProductSales, WeeklySales
from app.services import reports as reports_service
from app.services import statistics as statistics_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ReportSummary)
def summary(
    period: Literal["day", "week", "month"] | None = None,
    shift_id: int | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return reports_service.summary(db, period, shift_id)


@router.get("/weekly-sales", response_model=WeeklySales)
def weekly_sales(
    week_offset: int = Query(default=0, ge=0, le=104),
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return statistics_service.weekly_sales(db, week_offset)


@router.get("/daily-product-sales", response_model=DailyProductSales)
def daily_product_sales(
    day_offset: int = Query(default=0, ge=0, le=365),
    selected_date: date | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    if selected_date is not None:
        _, _, today = day_bounds(0, settings.timezone)
        day_offset = (today - selected_date).days
        if day_offset < 0:
            raise HTTPException(status_code=422, detail="لا يمكن اختيار تاريخ في المستقبل")
    return statistics_service.daily_product_sales(db, day_offset)


@router.get("/sales", response_model=SalesReport)
def sales(
    date_from: date | None = None,
    date_to: date | None = None,
    cashier_id: int | None = None,
    shift_id: int | None = None,
    status_filter: Literal["all", "completed", "cancelled"] = Query(default="all", alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return reports_service.sales_report(
        db,
        date_from=date_from,
        date_to=date_to,
        cashier_id=cashier_id,
        shift_id=shift_id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )


@router.get("/sales/{sale_id}", response_model=SaleDetail)
def sale_detail(sale_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    return reports_service.sale_detail(db, sale_id)
