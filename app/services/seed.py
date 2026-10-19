from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.utils.money import lyd_to_dirhams

CATEGORY_NAMES = (
    "مشروبات",
    "عصائر طبيعية",
    "قهوة",
    "سندوتشات",
    "حلويات",
)

CATALOG_PRODUCTS: tuple[tuple[str, str, str], ...] = (
    ("قهوة عادية", "قهوة", "3"),
    ("قهوة دبل", "قهوة", "5"),
    ("ماء", "مشروبات", "1"),
)


def seed_catalog(db: Session) -> None:
    """يملأ التصنيفات والمنتجات الافتراضية عند أول إنشاء لقاعدة البيانات."""
    if db.scalar(select(Category.id).limit(1)) is not None:
        return

    categories: dict[str, Category] = {}
    for name in CATEGORY_NAMES:
        category = Category(name=name, is_active=True)
        db.add(category)
        categories[name] = category

    db.flush()

    for product_name, category_name, price_lyd in CATALOG_PRODUCTS:
        category = categories[category_name]
        db.add(
            Product(
                category_id=category.id,
                name=product_name,
                price_dirhams=lyd_to_dirhams(Decimal(price_lyd)),
                is_active=True,
            )
        )

    db.commit()
