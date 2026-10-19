from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import require_cashier
from app.db.session import get_db
from app.models.user import User
from app.schemas.shift import ShiftClose, ShiftOpen, ShiftOut
from app.services import shifts as shifts_service

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post("/open", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
def open_shift(body: ShiftOpen, db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return shifts_service.open_shift(db, user, body)


@router.get("/current", response_model=ShiftOut)
def current_shift(db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return shifts_service.current_shift(db, user)


@router.post("/{shift_id}/close", response_model=ShiftOut)
def close_shift(
    shift_id: int,
    body: ShiftClose,
    db: Session = Depends(get_db),
    user: User = Depends(require_cashier),
):
    return shifts_service.close_shift(db, user, shift_id, body)
