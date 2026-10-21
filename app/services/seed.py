from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.utils.money import lyd_to_dirhams

CATEGORY_NAMES = (
    "مشروبات",
    "عصائر طبيعيه",
    "قهوة",
    "سندوتشات",
    "حلويات",
)

CATALOG_PRODUCTS: tuple[tuple[str, str, str], ...] = (
    ("قهوة عادية", "قهوة", "3"),
    ("قهوة دبل", "قهوة", "5"),
    ("نسكافيه عادي", "قهوة", "3"),
    ("نسكافيه تام", "قهوة", "5"),
    ("كابتشينو طلياني", "قهوة", "4"),
    ("شاهي مغربي", "قهوة", "3"),
    ("قهوة عربيه", "قهوة", "3"),
    ("بريوش نوتيلا كامل", "حلويات", "6"),
    ("بريوش جبنه وزعتر", "حلويات", "7"),
    ("بسبوسة الغزال", "حلويات", "5"),
    ("مالفي عادي", "حلويات", "1"),
    ("مالفي العالم", "حلويات", "2"),
    ("عصير فراوله طبيعي", "عصائر طبيعيه", "6"),
    ("عصير مانجا طبيعي", "عصائر طبيعيه", "7"),
    ("عصير كوكيتيل", "عصائر طبيعيه", "8"),
    ("عصير افوكادو", "عصائر طبيعيه", "10"),
    ("مشروب بيبسي", "مشروبات", "3"),
    ("موخيتو", "مشروبات", "10"),
    ("سندوتش تن وجبنه", "سندوتشات", "8"),
    ("كريب نوتيلا", "حلويات", "11"),
    ("كريب نوتيلا عسل ولوز", "حلويات", "15"),
    ("كريب حار أجبان", "حلويات", "18"),
    ("سموذي", "مشروبات", "10"),
)


def seed_catalog(db: Session, *, commit: bool = True) -> None:
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

    if commit:
        db.commit()
    else:
        db.flush()
