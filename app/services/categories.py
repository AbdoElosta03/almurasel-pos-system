from fastapi import status

from app.core.errors import api_error
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.models.sale import SaleItem
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.pagination import paginate


def create_category(db: Session, body: CategoryCreate) -> Category:
    category = Category(name=body.name, is_active=True)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "category_exists", "Category already exists") from None
    db.refresh(category)
    return category


def list_categories(db: Session, user: User, page: int | None = None, page_size: int = 20):
    stmt = select(Category).order_by(Category.id)
    if user.role != "admin":
        stmt = stmt.where(Category.is_active.is_(True))
    if page is not None:
        return paginate(db, stmt, page, page_size)
    return list(db.scalars(stmt).all())


def update_category(db: Session, category_id: int, body: CategoryUpdate) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "category_not_found", "Category not found")
    if body.name is not None:
        taken = db.scalar(select(Category.id).where(Category.name == body.name, Category.id != category_id))
        if taken is not None:
            raise api_error(status.HTTP_409_CONFLICT, "category_exists", "Category already exists")
        category.name = body.name
    if body.is_active is not None:
        category.is_active = body.is_active
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "category_exists", "Category already exists") from None
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = db.get(Category, category_id)
    if category is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "category_not_found", "Category not found")
    products = list(db.scalars(select(Product).where(Product.category_id == category_id)).all())
    product_ids = [product.id for product in products]
    if product_ids:
        sold = db.scalar(select(SaleItem.id).where(SaleItem.product_id.in_(product_ids)).limit(1))
        if sold is not None:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "category_used_in_sale",
                "Category cannot be deleted because one of its products appears on a previous sale",
            )
        for product in products:
            db.delete(product)
    db.delete(category)
    db.commit()
