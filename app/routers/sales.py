from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_cashier
from app.db.session import get_db
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleOut
from app.services import sales as sales_service

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(body: SaleCreate, db: Session = Depends(get_db), user: User = Depends(require_cashier)):
    return sales_service.create_sale(db, user, body)


@router.post("/{sale_id}/cancel", response_model=SaleOut)
def cancel_sale(sale_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return sales_service.cancel_sale(db, user, sale_id)
