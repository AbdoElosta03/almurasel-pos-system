"""Clear business records while preserving the requesting administrator."""

import secrets

from sqlalchemy import delete, update
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem
from app.models.sale import Sale, SaleItem
from app.models.shift import Shift
from app.models.user import User
from app.services import backups
from app.services.seed import seed_catalog


def reset_database(engine: Engine, admin_id: int) -> dict:
    # API maintenance gate prevents sales and automatic backups while this runs.
    with backups._lock:
        safety_copy = backups._create(engine, "safety")
        with Session(engine) as db, db.begin():
            # Explicit child-before-parent order respects SQLite foreign keys.
            for model in (SaleItem, PurchaseItem, Sale, Purchase, Shift, AuditLog, Product, Category):
                db.execute(delete(model))
            db.execute(delete(User).where(User.id != admin_id))
            result = db.execute(
                update(User)
                .where(User.id == admin_id, User.role == "admin", User.is_active.is_(True))
                .values(token_version=User.token_version + secrets.randbelow(2**31 - 1) + 1)
            )
            if result.rowcount != 1:
                raise RuntimeError("Administrator no longer exists")
            seed_catalog(db, commit=False)
        backups._keep_only(safety_copy["filename"])
        return safety_copy
