from datetime import date

from fastapi import status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session, aliased

from app.core.config import settings
from app.core.errors import api_error
from app.models.sale import Sale
from app.models.shift import Shift
from app.models.user import User
from app.schemas.report import ReportSummary, SaleDetail, SalesReport, SalesReportItem, SalesReportSummary
from app.schemas.sale import SaleOut
from app.utils.money import dirhams_to_lyd
from app.utils.time import date_range_bounds, period_bounds


def summary(db: Session, period: str | None, shift_id: int | None) -> ReportSummary:
    if shift_id is None and period is None:
        raise api_error(status.HTTP_400_BAD_REQUEST, "report_filter_required", "Provide period or shift_id")
    filters = [Sale.status == "completed"]
    if shift_id is not None:
        shift = db.get(Shift, shift_id)
        if shift is None:
            raise api_error(status.HTTP_404_NOT_FOUND, "shift_not_found", "Shift not found")
        filters.append(Sale.shift_id == shift_id)
    else:
        start, end = period_bounds(period or "", settings.timezone)
        filters.append(Sale.created_at >= start)
        filters.append(Sale.created_at < end)
    cash = case((Sale.payment_method == "cash", Sale.total_dirhams), else_=0)
    card = case((Sale.payment_method == "card", Sale.total_dirhams), else_=0)
    count, total, cash_total, card_total = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total_dirhams), 0),
            func.coalesce(func.sum(cash), 0),
            func.coalesce(func.sum(card), 0),
        ).where(*filters)
    ).one()
    return ReportSummary(
        count=int(count),
        total_lyd=dirhams_to_lyd(int(total)),
        cash_lyd=dirhams_to_lyd(int(cash_total)),
        card_lyd=dirhams_to_lyd(int(card_total)),
    )


def sales_report(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    cashier_id: int | None,
    shift_id: int | None,
    status_filter: str,
    page: int,
    page_size: int,
) -> SalesReport:
    scope = _report_scope(db, date_from, date_to, cashier_id, shift_id)
    summary = _sales_summary(db, scope)
    list_filters = list(scope)
    if status_filter != "all":
        list_filters.append(Sale.status == status_filter)
    total = int(db.scalar(select(func.count()).select_from(Sale).where(*list_filters)) or 0)
    cashier = aliased(User)
    canceller = aliased(User)
    rows = db.execute(
        select(Sale, cashier.username, canceller.username)
        .join(cashier, Sale.cashier_id == cashier.id)
        .outerjoin(canceller, Sale.cancelled_by == canceller.id)
        .where(*list_filters)
        .order_by(Sale.created_at.desc(), Sale.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return SalesReport(
        summary=summary,
        items=[
            SalesReportItem(
                id=sale.id,
                created_at=sale.created_at,
                cashier_id=sale.cashier_id,
                cashier_username=cashier_username,
                shift_id=sale.shift_id,
                payment_method=sale.payment_method,
                status=sale.status,
                total_lyd=sale.total_lyd,
                cancelled_at=sale.cancelled_at,
                cancelled_by=sale.cancelled_by,
                cancelled_by_username=canceller_username,
            )
            for sale, cashier_username, canceller_username in rows
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


def sale_detail(db: Session, sale_id: int) -> SaleDetail:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "sale_not_found", "Sale not found")
    cashier = db.get(User, sale.cashier_id)
    canceller = db.get(User, sale.cancelled_by) if sale.cancelled_by is not None else None
    return SaleDetail.model_validate({
        **SaleOut.model_validate(sale).model_dump(),
        "cashier_username": cashier.username,
        "cancelled_by_username": canceller.username if canceller else None,
    })


def _report_scope(
    db: Session,
    date_from: date | None,
    date_to: date | None,
    cashier_id: int | None,
    shift_id: int | None,
) -> list:
    if shift_id is not None:
        if db.get(Shift, shift_id) is None:
            raise api_error(status.HTTP_404_NOT_FOUND, "shift_not_found", "Shift not found")
        return [Sale.shift_id == shift_id]
    if date_from is None or date_to is None:
        raise api_error(status.HTTP_400_BAD_REQUEST, "report_filter_required", "Provide a date range or shift_id")
    if date_from > date_to:
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_date_range", "date_from must be on or before date_to")
    if cashier_id is not None and db.get(User, cashier_id) is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "user_not_found", "User not found")
    start, end = date_range_bounds(date_from, date_to, settings.timezone)
    scope = [Sale.created_at >= start, Sale.created_at < end]
    if cashier_id is not None:
        scope.append(Sale.cashier_id == cashier_id)
    return scope


def _sales_summary(db: Session, scope: list) -> SalesReportSummary:
    completed = Sale.status == "completed"
    cancelled = Sale.status == "cancelled"
    count, total, cash_total, card_total, cancelled_count, cancelled_total = db.execute(
        select(
            func.coalesce(func.sum(case((completed, 1), else_=0)), 0),
            func.coalesce(func.sum(case((completed, Sale.total_dirhams), else_=0)), 0),
            func.coalesce(func.sum(case((and_(completed, Sale.payment_method == "cash"), Sale.total_dirhams), else_=0)), 0),
            func.coalesce(func.sum(case((and_(completed, Sale.payment_method == "card"), Sale.total_dirhams), else_=0)), 0),
            func.coalesce(func.sum(case((cancelled, 1), else_=0)), 0),
            func.coalesce(func.sum(case((cancelled, Sale.total_dirhams), else_=0)), 0),
        ).where(*scope)
    ).one()
    return SalesReportSummary(
        count=int(count),
        total_lyd=dirhams_to_lyd(int(total)),
        cash_lyd=dirhams_to_lyd(int(cash_total)),
        card_lyd=dirhams_to_lyd(int(card_total)),
        cancelled_count=int(cancelled_count),
        cancelled_lyd=dirhams_to_lyd(int(cancelled_total)),
    )
