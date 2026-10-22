from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.daily_closing import DailyClosingIn, DailyClosingList, DailyClosingOut
from app.services import daily_closings as daily_closings_service

router = APIRouter(prefix="/daily-closings", tags=["daily-closings"])


@router.get("", response_model=DailyClosingList)
def list_daily_closings(
    day: date | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return daily_closings_service.list_for_day(db, day)


@router.post("/{shift_id}", response_model=DailyClosingOut)
def close_daily_account(
    shift_id: int,
    body: DailyClosingIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return daily_closings_service.reconcile(db, admin, shift_id, body)
