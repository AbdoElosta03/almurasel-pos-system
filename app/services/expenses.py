from datetime import date, timedelta

from fastapi import status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.expense import Expense
from app.models.sale import Sale
from app.models.shift import Shift
from app.models.user import User
from app.schemas.expense import ExpenseCreate
from app.services.shifts import _open_shift
from app.utils.money import dirhams_to_lyd, lyd_to_dirhams
from app.utils.time import utc_now, week_bounds


def drawer_totals_by_shift(db: Session, shift_ids: list[int]) -> dict[int, int]:
    if not shift_ids:
        return {}
    rows = db.execute(
        select(Expense.shift_id, func.coalesce(func.sum(Expense.amount_dirhams), 0))
        .where(Expense.shift_id.in_(shift_ids), Expense.paid_from == "drawer")
        .group_by(Expense.shift_id)
    ).all()
    return {int(shift_id): int(total) for shift_id, total in rows if shift_id is not None}


def create_expense(db: Session, user: User, body: ExpenseCreate) -> dict:
    if user.role == "cashier":
        expense = _cashier_expense(db, user, body)
    elif user.role == "admin":
        expense = _admin_expense(db, user, body)
    else:
        raise api_error(status.HTTP_403_FORBIDDEN, "not_allowed", "Not allowed")
    db.add(expense)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="expense.created", entity_type="expense", entity_id=expense.id))
    db.commit()
    db.refresh(expense)
    return _one(db, expense)


def list_expenses(
    db: Session,
    page: int,
    page_size: int,
    date_from: date | None,
    date_to: date | None,
    category: str | None,
    paid_from: str | None,
    query: str | None,
) -> dict:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_date_range", "Start date must be on or before end date")
    filters = []
    if date_from is not None:
        filters.append(Expense.expense_date >= date_from)
    if date_to is not None:
        filters.append(Expense.expense_date <= date_to)
    if category is not None:
        filters.append(Expense.category == category)
    if paid_from is not None:
        filters.append(Expense.paid_from == paid_from)
    term = query.strip() if query else ""
    if term:
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filters.append(Expense.payee_name.ilike(f"%{escaped}%", escape="\\"))
    total = int(db.scalar(select(func.count()).select_from(Expense).where(*filters)) or 0)
    total_dirhams = int(db.scalar(select(func.coalesce(func.sum(Expense.amount_dirhams), 0)).where(*filters)) or 0)
    items = list(
        db.scalars(
            select(Expense)
            .where(*filters)
            .order_by(Expense.expense_date.desc(), Expense.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return {
        "items": _many(db, items),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_lyd": dirhams_to_lyd(total_dirhams),
    }


def period_totals(db: Session) -> dict:
    today = _today(settings.timezone)
    _, _, week_start, week_end = week_bounds(0, settings.timezone)
    month_start = today.replace(day=1)
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    month_end = next_month - timedelta(days=1)
    day_amount, day_count = _between(db, today, today)
    week_amount, week_count = _between(db, week_start, week_end)
    month_amount, month_count = _between(db, month_start, month_end)
    return {
        "day_lyd": dirhams_to_lyd(day_amount),
        "day_count": day_count,
        "week_lyd": dirhams_to_lyd(week_amount),
        "week_count": week_count,
        "month_lyd": dirhams_to_lyd(month_amount),
        "month_count": month_count,
    }


def _today(timezone_name: str) -> date:
    from datetime import datetime
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(timezone_name)).date()


def list_drawer_shifts(db: Session) -> list[dict]:
    shifts = list(
        db.scalars(
            select(Shift)
            .where(Shift.reconciled_at.is_(None))
            .order_by(Shift.opened_at.desc(), Shift.id.desc())
            .limit(100)
        ).all()
    )
    names = _usernames(db, {shift.cashier_id for shift in shifts})
    return [
        {
            "shift_id": shift.id,
            "cashier_username": names.get(shift.cashier_id, ""),
            "status": shift.status,
            "opened_at": shift.opened_at,
        }
        for shift in shifts
    ]


def current_drawer(db: Session, user: User) -> dict:
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "no_open_shift", "No open shift")
    completed = Sale.status == "completed"
    cash = func.coalesce(
        func.sum(case((and_(completed, Sale.payment_method == "cash"), Sale.total_dirhams), else_=0)),
        0,
    )
    cash_dirhams = int(db.scalar(select(cash).where(Sale.shift_id == shift.id)) or 0)
    expense_dirhams = drawer_totals_by_shift(db, [shift.id]).get(shift.id, 0)
    items = list(
        db.scalars(
            select(Expense)
            .where(Expense.shift_id == shift.id, Expense.paid_from == "drawer")
            .order_by(Expense.id.desc())
        ).all()
    )
    return {
        "shift_id": shift.id,
        "opening_cash_lyd": dirhams_to_lyd(shift.opening_cash_dirhams),
        "cash_sales_lyd": dirhams_to_lyd(cash_dirhams),
        "drawer_expenses_lyd": dirhams_to_lyd(expense_dirhams),
        "expected_drawer_lyd": dirhams_to_lyd(shift.opening_cash_dirhams + cash_dirhams - expense_dirhams),
        "items": _many(db, items),
    }


def get_expense(db: Session, expense_id: int) -> dict:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "expense_not_found", "Expense not found")
    return _one(db, expense)


def delete_expense(db: Session, user: User, expense_id: int) -> None:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "expense_not_found", "Expense not found")
    shift = db.get(Shift, expense.shift_id) if expense.shift_id is not None else None
    if shift is not None and shift.reconciled_at is not None:
        raise api_error(status.HTTP_409_CONFLICT, "expense_locked", "Expense is locked after the shift account is closed")
    if user.role == "cashier":
        open_shift = _open_shift(db, user.id)
        if expense.paid_from != "drawer" or open_shift is None or expense.shift_id != open_shift.id:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "cashier_open_shift_only",
                "Cashier can only delete a drawer expense on their open shift",
            )
    elif user.role != "admin":
        raise api_error(status.HTTP_403_FORBIDDEN, "not_allowed", "Not allowed")
    db.delete(expense)
    db.add(AuditLog(actor_id=user.id, action="expense.deleted", entity_type="expense", entity_id=expense_id))
    db.commit()


def _cashier_expense(db: Session, user: User, body: ExpenseCreate) -> Expense:
    if body.paid_from != "drawer":
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "cashier_drawer_only",
            "Cashier can only record expenses paid from the drawer",
        )
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_400_BAD_REQUEST, "no_open_shift", "No open shift")
    if body.shift_id is not None and body.shift_id != shift.id:
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "cashier_drawer_only",
            "Cashier can only record expenses paid from the drawer",
        )
    return _new(user, body, shift.id)


def _admin_expense(db: Session, user: User, body: ExpenseCreate) -> Expense:
    if body.paid_from == "external":
        if body.shift_id is not None:
            raise api_error(
                status.HTTP_400_BAD_REQUEST,
                "expense_shift_not_allowed",
                "An expense paid outside the drawer is not linked to a shift",
            )
        return _new(user, body, None)
    if body.shift_id is None:
        raise api_error(status.HTTP_400_BAD_REQUEST, "expense_shift_required", "A drawer expense requires a shift")
    shift = db.get(Shift, body.shift_id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "shift_not_found", "Shift not found")
    if shift.reconciled_at is not None:
        raise api_error(status.HTTP_409_CONFLICT, "expense_locked", "Expense is locked after the shift account is closed")
    return _new(user, body, shift.id)


def _new(user: User, body: ExpenseCreate, shift_id: int | None) -> Expense:
    return Expense(
        expense_date=body.expense_date,
        category=body.category,
        payee_name=body.payee_name,
        note=body.note,
        amount_dirhams=lyd_to_dirhams(body.amount_lyd),
        paid_from=body.paid_from,
        shift_id=shift_id,
        created_by=user.id,
        created_at=utc_now(),
    )


def _between(db: Session, start: date, end: date) -> tuple[int, int]:
    amount, count = db.execute(
        select(func.coalesce(func.sum(Expense.amount_dirhams), 0), func.count()).where(
            Expense.expense_date >= start,
            Expense.expense_date <= end,
        )
    ).one()
    return int(amount), int(count)


def _one(db: Session, expense: Expense) -> dict:
    return _many(db, [expense])[0]


def _many(db: Session, expenses: list[Expense]) -> list[dict]:
    shift_ids = {expense.shift_id for expense in expenses if expense.shift_id is not None}
    shifts = {
        shift.id: shift
        for shift in db.scalars(select(Shift).where(Shift.id.in_(shift_ids))).all()
    } if shift_ids else {}
    user_ids = {expense.created_by for expense in expenses}
    user_ids.update(shift.cashier_id for shift in shifts.values())
    names = _usernames(db, user_ids)
    rows = []
    for expense in expenses:
        shift = shifts.get(expense.shift_id) if expense.shift_id is not None else None
        rows.append(
            {
                "id": expense.id,
                "expense_date": expense.expense_date,
                "category": expense.category,
                "payee_name": expense.payee_name,
                "note": expense.note,
                "amount_lyd": expense.amount_lyd,
                "paid_from": expense.paid_from,
                "shift_id": expense.shift_id,
                "shift_cashier_username": None if shift is None else names.get(shift.cashier_id, ""),
                "created_by": expense.created_by,
                "created_by_username": names.get(expense.created_by, ""),
                "created_at": expense.created_at,
                "deletable": shift is None or shift.reconciled_at is None,
            }
        )
    return rows


def _usernames(db: Session, user_ids: set[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    return {
        user_id: username
        for user_id, username in db.execute(select(User.id, User.username).where(User.id.in_(user_ids))).all()
    }
