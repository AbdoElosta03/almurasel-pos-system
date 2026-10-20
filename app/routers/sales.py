from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_cashier
from app.db.session import get_db
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleOut, SalePage
from app.services import sales as sales_service

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(body: SaleCreate, db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return sales_service.create_sale(db, user, body)


@router.get("/my-open-shift", response_model=SalePage)
def list_my_open_shift_sales(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_cashier),
):
    return sales_service.list_open_shift_sales(db, user, page, page_size)


@router.get("/my-open-shift/{sale_id}", response_model=SaleOut)
def get_my_open_shift_sale(sale_id: int, db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return sales_service.get_open_shift_sale(db, user, sale_id)


@router.post("/{sale_id}/cancel", response_model=SaleOut)
def cancel_sale(sale_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return sales_service.cancel_sale(db, user, sale_id)
