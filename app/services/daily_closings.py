from datetime import date, datetime

from fastapi import status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.sale import Sale
from app.models.shift import Shift
from app.models.user import User
from app.schemas.daily_closing import DailyClosingIn, DailyClosingList, DailyClosingOut, DailyClosingResult
from app.utils.money import dirhams_to_lyd, lyd_to_dirhams
from app.utils.time import date_range_bounds, utc_now


def _today(timezone_name: str) -> date:
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(timezone_name)).date()


def _sales_by_shift(db: Session, shift_ids: list[int]) -> dict[int, tuple[int, int]]:
    if not shift_ids:
        return {}
    completed = Sale.status == "completed"
    cash = func.coalesce(
        func.sum(case((and_(completed, Sale.payment_method == "cash"), Sale.total_dirhams), else_=0)),
        0,
    )
    card = func.coalesce(
        func.sum(case((and_(completed, Sale.payment_method == "card"), Sale.total_dirhams), else_=0)),
        0,
    )
    rows = db.execute(
        select(Sale.shift_id, cash, card).where(Sale.shift_id.in_(shift_ids)).group_by(Sale.shift_id)
    ).all()
    return {int(shift_id): (int(cash_total), int(card_total)) for shift_id, cash_total, card_total in rows}


def _result(shift_status: str, counted: int | None, variance: int | None) -> DailyClosingResult:
    if shift_status != "closed":
        return "open"
    if counted is None or variance is None:
        return "pending"
    if variance > 0:
        return "surplus"
    if variance < 0:
        return "deficit"
    return "match"


def _row(shift: Shift, username: str, cash_dirhams: int, card_dirhams: int) -> DailyClosingOut:
    expected = shift.opening_cash_dirhams + cash_dirhams
    counted = shift.counted_cash_dirhams
    variance = None if counted is None else counted - expected
    return DailyClosingOut(
        shift_id=shift.id,
        cashier_id=shift.cashier_id,
        cashier_username=username,
        status=shift.status,
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        opening_cash_lyd=dirhams_to_lyd(shift.opening_cash_dirhams),
        closing_cash_lyd=None if shift.closing_cash_dirhams is None else dirhams_to_lyd(shift.closing_cash_dirhams),
        sales_total_lyd=dirhams_to_lyd(cash_dirhams + card_dirhams),
        cash_sales_lyd=dirhams_to_lyd(cash_dirhams),
        card_sales_lyd=dirhams_to_lyd(card_dirhams),
        expected_drawer_lyd=dirhams_to_lyd(expected),
        counted_cash_lyd=None if counted is None else dirhams_to_lyd(counted),
        variance_lyd=None if variance is None else dirhams_to_lyd(variance),
        result=_result(shift.status, counted, variance),
        reconciled_at=shift.reconciled_at,
    )


def _figures(shift: Shift, live: dict[int, tuple[int, int]]) -> tuple[int, int]:
    if shift.reconciled_at is not None:
        return shift.reconciled_cash_sales_dirhams or 0, shift.reconciled_card_sales_dirhams or 0
    return live.get(shift.id, (0, 0))


def list_for_day(db: Session, day: date | None) -> DailyClosingList:
    selected = day or _today(settings.timezone)
    start, end = date_range_bounds(selected, selected, settings.timezone)
    shifts = list(
        db.scalars(
            select(Shift)
            .where(Shift.opened_at >= start, Shift.opened_at < end)
            .order_by(Shift.opened_at.desc(), Shift.id.desc())
        ).all()
    )
    names: dict[int, str] = {}
    if shifts:
        cashier_ids = {shift.cashier_id for shift in shifts}
        names = {
            user_id: username
            for user_id, username in db.execute(select(User.id, User.username).where(User.id.in_(cashier_ids))).all()
        }
    live = _sales_by_shift(db, [shift.id for shift in shifts if shift.reconciled_at is None])
    return DailyClosingList(
        date=selected,
        items=[_row(shift, names.get(shift.cashier_id, ""), *_figures(shift, live)) for shift in shifts],
    )


def reconcile(db: Session, admin: User, shift_id: int, body: DailyClosingIn) -> DailyClosingOut:
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "shift_not_found", "Shift not found")
    if shift.status != "closed":
        raise api_error(status.HTTP_400_BAD_REQUEST, "shift_still_open", "Shift is still open")
    if shift.reconciled_at is not None:
        raise api_error(status.HTTP_409_CONFLICT, "account_already_closed", "Account is already closed")
    cash_dirhams, card_dirhams = _sales_by_shift(db, [shift.id]).get(shift.id, (0, 0))
    shift.counted_cash_dirhams = lyd_to_dirhams(body.counted_cash_lyd)
    shift.reconciled_cash_sales_dirhams = cash_dirhams
    shift.reconciled_card_sales_dirhams = card_dirhams
    shift.reconciled_at = utc_now()
    shift.reconciled_by = admin.id
    db.add(AuditLog(actor_id=admin.id, action="shift.account_closed", entity_type="shift", entity_id=shift.id))
    db.commit()
    db.refresh(shift)
    username = db.scalar(select(User.username).where(User.id == shift.cashier_id)) or ""
    return _row(shift, username, cash_dirhams, card_dirhams)
