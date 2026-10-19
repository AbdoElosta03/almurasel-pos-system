from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.schemas.report import ReportSummary, SaleDetail, SalesReport
from app.services import reports as reports_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ReportSummary)
def summary(
    period: Literal["day", "week", "month"] | None = None,
    shift_id: int | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return reports_service.summary(db, period, shift_id)


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
