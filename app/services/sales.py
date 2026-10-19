from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error

from app.models.audit_log import AuditLog
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.shift import Shift
from app.models.user import User
from app.schemas.sale import SaleCreate
from app.services.shifts import _open_shift
from app.utils.money import line_total
from app.utils.time import utc_now


def _write_audit(db: Session, actor_id: int, action: str, sale_id: int) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type="sale",
            entity_id=sale_id,
        )
    )


def create_sale(db: Session, user: User, body: SaleCreate) -> Sale:
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_400_BAD_REQUEST, "no_open_shift", "No open shift")
    sale = Sale(
        shift_id=shift.id,
        cashier_id=user.id,
        payment_method=body.payment_method,
        status="completed",
        total_dirhams=0,
    )
    total = 0
    for item in body.items:
        product = db.get(Product, item.product_id)
        if product is None or not product.is_active or not product.category.is_active:
            raise api_error(status.HTTP_400_BAD_REQUEST, "product_not_available", "Product is not available")
        amount = line_total(product.price_dirhams, item.qty)
        total += amount
        sale.items.append(
            SaleItem(
                product_id=product.id,
                product_name=product.name,
                unit_price_dirhams=product.price_dirhams,
                qty=item.qty,
                line_total_dirhams=amount,
            )
        )
    sale.total_dirhams = total
    db.add(sale)
    db.flush()
    _write_audit(db, user.id, "sale.created", sale.id)
    db.commit()
    db.refresh(sale)
    return sale


def cancel_sale(db: Session, user: User, sale_id: int) -> Sale:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "sale_not_found", "Sale not found")
    if sale.status != "completed":
        raise api_error(status.HTTP_400_BAD_REQUEST, "sale_already_cancelled", "Sale is already cancelled")
    if user.role == "cashier":
        shift = db.get(Shift, sale.shift_id)
        if sale.cashier_id != user.id or shift is None or shift.status != "open":
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "cashier_cancel_own_shift_only",
                "Cashier can only cancel a sale from their open shift",
            )
    elif user.role != "admin":
        raise api_error(status.HTTP_403_FORBIDDEN, "not_allowed", "Not allowed")
    sale.status = "cancelled"
    sale.cancelled_at = utc_now()
    sale.cancelled_by = user.id
    _write_audit(db, user.id, "sale.cancelled", sale.id)
    db.commit()
    db.refresh(sale)
    return sale
