from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseOut, PurchaseSummary
from app.services import purchases as purchases_service
from app.utils.pagination import Page

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
def create_purchase(body: PurchaseCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return purchases_service.create_purchase(db, user, body)


@router.get("", response_model=Page[PurchaseSummary])
def list_purchases(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return purchases_service.list_purchases(db, page, page_size)


@router.get("/{purchase_id}", response_model=PurchaseOut)
def get_purchase(purchase_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return purchases_service.get_purchase(db, purchase_id)


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(purchase_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    purchases_service.delete_purchase(db, purchase_id, user)
