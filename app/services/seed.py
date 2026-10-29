from decimal import Decimal
from pathlib import Path
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.core.password_policy import assert_numeric_pin
from app.core.security import hash_password
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
    ("نسكافيه تام", "قهوة", "6"),
    ("كابتشينو طلياني", "قهوة", "4"),
    ("شاهي مغربي", "قهوة", "3"),
    ("قهوة عربيه", "قهوة", "4"),
    ("كنفركس", "قهوة", "6"),
    ("شاي كيس", "قهوة", "1.5"),
    ("شاهي كيس ", "قهوة", "1.5"),
    ("سبسيال", "قهوة", "4"),
    ("سبسيال دبل", "قهوة", "8"),
    ("قنينة ماء", "مشروبات", "1"),
    ("بريوش نوتيلا كامل", "حلويات", "6"),
    ("بريوش جبنه وزعتر", "حلويات", "7"),
    ("بسبوسة الغزال", "حلويات", "6"),
    ("مالفي عادي", "حلويات", "1"),
    ("مالفي العالم", "حلويات", "2"),
    ("كريب نوتيلا", "حلويات", "11"),
    ("كريب نوتيلا عسل ولوز", "حلويات", "15"),
    ("كريب حار أجبان", "حلويات", "18"),
    ("بسبوسه عادي", "حلويات", "3"),
    ("كلير", "حلويات", "3"),
    ("كيكا حمره", "حلويات", "6"),
    ("كيكا كرميل", "حلويات", "7"),
    ("كيكا عادي", "حلويات", "2"),
    ("سندوتش تن وجبنه", "سندوتشات", "8"),
    ("سندوتش شوفان", "سندوتشات", "9"),
    ("عصير فراوله طبيعي", "عصائر طبيعيه", "6"),
    ("عصير مانجا طبيعي", "عصائر طبيعيه", "7"),
    ("عصير كوكيتيل", "عصائر طبيعيه", "8"),
    ("عصير افوكادو", "عصائر طبيعيه", "10"),
    ("مشروب بيبسي", "مشروبات", "3"),
    ("موخيتو", "مشروبات", "10"),
    ("سموذي", "مشروبات", "10"),
    ("XR", "مشروبات", "5"),
    ("عصير ندئ", "مشروبات", "3"),
    ("عصير نسيم", "مشروبات", "3"),
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

DEFAULT_CASHIERS = (
    ("حسن", "12345678"),
    ("عوض", "12345"),
)


def seed_cashiers(db: Session, *, commit: bool = True) -> None:
    """Create missing default cashiers without overwriting existing accounts."""
    for username, pin in DEFAULT_CASHIERS:
        if db.scalar(select(User.id).where(User.username == username)) is not None:
            continue
        assert_numeric_pin(pin)
        db.add(User(
            username=username,
            password_hash=hash_password(pin),
            role="cashier",
            is_active=True,
            token_version=secrets.randbelow(2**31 - 1) + 1,
        ))
    if commit:
        db.commit()
    else:
        db.flush()


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
        image_file = PRODUCT_IMAGE_FILES.get(product_name)
        image_data = (IMAGE_DIR / image_file).read_bytes() if image_file else None
        db.add(
            Product(
                category_id=category.id,
                name=product_name,
                price_dirhams=lyd_to_dirhams(Decimal(price_lyd)),
                is_active=True,
                image_data=image_data,
                image_content_type="image/svg+xml" if image_data else None,
            )
        )

    if commit:
        db.commit()
    else:
        db.flush()
