from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin, require_cashier
from app.db.session import get_db
from app.models.user import User
from app.schemas.expense import (
    CurrentDrawer,
    DrawerShiftOption,
    ExpenseCreate,
    ExpenseList,
    ExpenseOut,
    ExpensePeriods,
)
from app.services import expenses as expenses_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(body: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return expenses_service.create_expense(db, user, body)


@router.get("", response_model=ExpenseList)
def list_expenses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    date_from: date | None = None,
    date_to: date | None = None,
    category: Literal["wage", "supplier_payment", "other"] | None = None,
    paid_from: Literal["drawer", "external"] | None = None,
    q: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return expenses_service.list_expenses(db, page, page_size, date_from, date_to, category, paid_from, q)


@router.get("/summary", response_model=ExpensePeriods)
def expense_summary(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return expenses_service.period_totals(db)


@router.get("/drawer-shifts", response_model=list[DrawerShiftOption])
def drawer_shifts(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return expenses_service.list_drawer_shifts(db)


@router.get("/current-drawer", response_model=CurrentDrawer)
def current_drawer(db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return expenses_service.current_drawer(db, user)


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return expenses_service.get_expense(db, expense_id)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    expenses_service.delete_expense(db, user, expense_id)
