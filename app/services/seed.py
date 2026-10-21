from decimal import Decimal
from pathlib import Path

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
    ("قنينة ماء", "مشروبات", "1"),
)

PRODUCT_IMAGE_FILES = {
    "قهوة عادية": "coffee-regular.svg",
    "قهوة دبل": "coffee-double.svg",
    "نسكافيه عادي": "nescafe.svg",
    "نسكافيه تام": "nescafe-chocolate.svg",
    "كابتشينو طلياني": "cappuccino-italian.svg",
    "شاهي مغربي": "moroccan-tea.svg",
    "قهوة عربيه": "coffee-regular.svg",
    "بريوش نوتيلا كامل": "brioche-croissant.svg",
    "بريوش جبنه وزعتر": "brioche-croissant.svg",
    "بسبوسة الغزال": "basbousa.svg",
    "مالفي عادي": "mille-feuille.svg",
    "مالفي العالم": "mille-feuille-chocolate.svg",
    "عصير فراوله طبيعي": "juice-strawberry.svg",
    "عصير مانجا طبيعي": "juice-mango.svg",
    "عصير كوكيتيل": "juice-cocktail.svg",
    "عصير افوكادو": "juice-avocado.svg",
    "مشروب بيبسي": "pepsi-drink.svg",
    "موخيتو": "mojito.svg",
    "سندوتش تن وجبنه": "sandwich-tuna-cheese.svg",
    "كريب نوتيلا": "crepe-nutella.svg",
    "كريب نوتيلا عسل ولوز": "crepe-nutella.svg",
    "كريب حار أجبان": "crepe-savory.svg",
    "سموذي": "smoothie.svg",
    "قنينة ماء": "water-bottle.svg",
}

IMAGE_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "product-images"


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
        image_data = (IMAGE_DIR / PRODUCT_IMAGE_FILES[product_name]).read_bytes()
        db.add(
            Product(
                category_id=category.id,
                name=product_name,
                price_dirhams=lyd_to_dirhams(Decimal(price_lyd)),
                is_active=True,
                image_data=image_data,
                image_content_type="image/svg+xml",
            )
        )

    if commit:
        db.commit()
    else:
        db.flush()
