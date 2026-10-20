from fastapi import status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, lazyload

from app.core.errors import api_error

from app.models.audit_log import AuditLog
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.shift import Shift
from app.models.user import User
from app.schemas.sale import OpenShiftSalesSummary, SaleCreate, SalePage
from app.utils.money import dirhams_to_lyd
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


def list_open_shift_sales(db: Session, user: User, page: int, page_size: int) -> SalePage:
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "no_open_shift", "No open shift")
    filters = [Sale.shift_id == shift.id, Sale.cashier_id == user.id]
    total = int(db.scalar(select(func.count()).select_from(Sale).where(*filters)) or 0)
    completed = Sale.status == "completed"
    cash = case((completed & (Sale.payment_method == "cash"), Sale.total_dirhams), else_=0)
    card = case((completed & (Sale.payment_method == "card"), Sale.total_dirhams), else_=0)
    cash_total, card_total = db.execute(
        select(
            func.coalesce(func.sum(cash), 0),
            func.coalesce(func.sum(card), 0),
        ).where(*filters)
    ).one()
    items = list(
        db.scalars(
            select(Sale).options(lazyload(Sale.items))
            .where(*filters)
            .order_by(Sale.created_at.desc(), Sale.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    item_counts = dict(
        db.execute(
            select(SaleItem.sale_id, func.count(SaleItem.id))
            .where(SaleItem.sale_id.in_([sale.id for sale in items]))
            .group_by(SaleItem.sale_id)
        ).all()
    ) if items else {}
    return SalePage(
        summary=OpenShiftSalesSummary(
            invoice_count=total,
            cash_lyd=dirhams_to_lyd(int(cash_total)),
            card_lyd=dirhams_to_lyd(int(card_total)),
        ),
        items=[
            {
                "id": sale.id,
                "payment_method": sale.payment_method,
                "status": sale.status,
                "total_lyd": sale.total_lyd,
                "created_at": sale.created_at,
                "item_count": item_counts.get(sale.id, 0),
            }
            for sale in items
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


def get_open_shift_sale(db: Session, user: User, sale_id: int) -> Sale:
    shift = _open_shift(db, user.id)
    if shift is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "no_open_shift", "No open shift")
    sale = db.scalar(
        select(Sale).where(Sale.id == sale_id, Sale.shift_id == shift.id, Sale.cashier_id == user.id)
    )
    if sale is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "sale_not_found", "Sale not found")
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
