from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.purchase import Purchase, PurchaseItem
from app.models.user import User
from app.schemas.purchase import PurchaseCreate
from app.utils.money import lyd_to_dirhams
from app.utils.pagination import paginate


def create_purchase(db: Session, user: User, body: PurchaseCreate) -> Purchase:
    purchase = Purchase(
        purchase_date=body.purchase_date,
        supplier_name=body.supplier_name,
        created_by=user.id,
        total_dirhams=0,
    )
    for item in body.items:
        amount = lyd_to_dirhams(item.line_total_lyd)
        purchase.items.append(
            PurchaseItem(item_name=item.item_name, quantity_milli=int(item.qty * 1000), line_total_dirhams=amount)
        )
        purchase.total_dirhams += amount
    db.add(purchase)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="purchase.created", entity_type="purchase", entity_id=purchase.id))
    db.commit()
    db.refresh(purchase)
    return purchase


def list_purchases(db: Session, page: int, page_size: int) -> dict:
    stmt = select(Purchase).order_by(Purchase.purchase_date.desc(), Purchase.id.desc())
    return paginate(db, stmt, page, page_size)


def get_purchase(db: Session, purchase_id: int) -> Purchase:
    purchase = db.get(Purchase, purchase_id)
    if purchase is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "purchase_not_found", "Purchase not found")
    return purchase


def delete_purchase(db: Session, purchase_id: int, user: User) -> None:
    purchase = get_purchase(db, purchase_id)
    db.delete(purchase)
    db.add(AuditLog(actor_id=user.id, action="purchase.deleted", entity_type="purchase", entity_id=purchase_id))
    db.commit()
