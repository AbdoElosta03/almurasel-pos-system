from fastapi import status
from sqlalchemy import select

from app.core.errors import api_error
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import ShiftClose, ShiftOpen
from app.utils.money import lyd_to_dirhams
from app.utils.time import utc_now


def _open_shift(db: Session, cashier_id: int) -> Shift | None:
    return db.scalar(select(Shift).where(Shift.cashier_id == cashier_id, Shift.status == "open"))


def open_shift(db: Session, user: User, body: ShiftOpen) -> Shift:
    if _open_shift(db, user.id) is not None:
        raise api_error(status.HTTP_409_CONFLICT, "open_shift_exists", "Cashier already has an open shift")
    shift = Shift(
        cashier_id=user.id,
        status="open",
        opening_cash_dirhams=lyd_to_dirhams(body.opening_cash_lyd),
    )
    db.add(shift)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "open_shift_exists", "Cashier already has an open shift") from None
    db.refresh(shift)
    return shift


def current_shift(db: Session, user: User) -> Shift:
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "no_open_shift", "No open shift")
    return shift


def close_shift(db: Session, user: User, shift_id: int, body: ShiftClose) -> Shift:
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "shift_not_found", "Shift not found")
    if shift.cashier_id != user.id:
        raise api_error(status.HTTP_403_FORBIDDEN, "cashier_close_own_shift_only", "Cashier can only close their own shift")
    if shift.status != "open":
        raise api_error(status.HTTP_400_BAD_REQUEST, "shift_already_closed", "Shift is already closed")
    shift.status = "closed"
    shift.closing_cash_dirhams = lyd_to_dirhams(body.closing_cash_lyd)
    shift.closed_at = utc_now()
    db.commit()
    db.refresh(shift)
    return shift
