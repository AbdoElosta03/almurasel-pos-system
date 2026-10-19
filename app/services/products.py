from fastapi import status

from app.core.errors import api_error
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.models.sale import SaleItem
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.money import lyd_to_dirhams
from app.utils.pagination import paginate


def create_product(db: Session, body: ProductCreate) -> Product:
    category = db.get(Category, body.category_id)
    if category is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "category_not_found", "Category not found")
    product = Product(
        category_id=body.category_id,
        name=body.name,
        price_dirhams=lyd_to_dirhams(body.price_lyd),
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def list_products(db: Session, user: User, category_id: int | None, page: int | None = None, page_size: int = 20):
    stmt = select(Product).order_by(Product.id)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if user.role != "admin":
        stmt = stmt.join(Category).where(Product.is_active.is_(True), Category.is_active.is_(True))
    if page is not None:
        return paginate(db, stmt, page, page_size)
    return list(db.scalars(stmt).all())


def update_product(db: Session, product_id: int, body: ProductUpdate) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "product_not_found", "Product not found")
    if body.category_id is not None:
        category = db.get(Category, body.category_id)
        if category is None:
            raise api_error(status.HTTP_404_NOT_FOUND, "category_not_found", "Category not found")
        product.category_id = body.category_id
    if body.name is not None:
        product.name = body.name
    if body.price_lyd is not None:
        product.price_dirhams = lyd_to_dirhams(body.price_lyd)
    if body.is_active is not None:
        product.is_active = body.is_active
    db.commit()
    db.refresh(product)
    return product


def product_was_sold(db: Session, product_id: int) -> bool:
    return db.scalar(select(SaleItem.id).where(SaleItem.product_id == product_id).limit(1)) is not None


def delete_product(db: Session, product_id: int) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "product_not_found", "Product not found")
    if product_was_sold(db, product_id):
        raise api_error(
            status.HTTP_409_CONFLICT,
            "product_used_in_sale",
            "Product cannot be deleted because it appears on a previous sale",
        )
    db.delete(product)
    db.commit()
