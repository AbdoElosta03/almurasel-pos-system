from sqlalchemy import select

from app.models.category import Category
from app.models.product import Product
from app.services.seed import seed_catalog


def test_seed_catalog_products_prices_and_idempotence(session_factory):
    expected = {
        'قهوة عادية': ('قهوة', 3),
        'قهوة دبل': ('قهوة', 5),
        'نسكافيه عادي': ('قهوة', 3),
        'نسكافيه تام': ('قهوة', 5),
        'كابتشينو طلياني': ('قهوة', 4),
        'شاهي مغربي': ('قهوة', 3),
        'قهوة عربيه': ('قهوة', 3),
        'بريوش نوتيلا كامل': ('حلويات', 6),
        'بريوش جبنه وزعتر': ('حلويات', 7),
        'بسبوسة الغزال': ('حلويات', 5),
        'مالفي عادي': ('حلويات', 1),
        'مالفي العالم': ('حلويات', 2),
        'عصير فراوله طبيعي': ('عصائر طبيعيه', 6),
        'عصير مانجا طبيعي': ('عصائر طبيعيه', 7),
        'عصير كوكيتيل': ('عصائر طبيعيه', 8),
        'عصير افوكادو': ('عصائر طبيعيه', 10),
        'مشروب بيبسي': ('مشروبات', 3),
        'موخيتو': ('مشروبات', 10),
        'سندوتش تن وجبنه': ('سندوتشات', 8),
        'كريب نوتيلا': ('حلويات', 11),
        'كريب نوتيلا عسل ولوز': ('حلويات', 15),
        'كريب حار أجبان': ('حلويات', 18),
        'سموذي': ('مشروبات', 10),
        'قنينة ماء': ('مشروبات', 1),
    }

    with session_factory() as db:
        seed_catalog(db)
        rows = db.execute(select(Product.name, Category.name, Product.price_dirhams).join(Category).order_by(Product.id)).all()
        assert {name: (category, price // 1000) for name, category, price in rows} == expected
        assert all(price == expected[name][1] * 1000 for name, _, price in rows)
        assert len(db.scalars(select(Category)).all()) == 5

        product = db.scalar(select(Product).where(Product.name == 'سموذي'))
        product.price_dirhams = 12_000
        db.commit()
        seed_catalog(db)
        assert db.scalar(select(Product.price_dirhams).where(Product.name == 'سموذي')) == 12_000
        seeded = db.scalars(select(Product)).all()
        assert len(seeded) == 24
        assert all(product.image_data and product.image_content_type == 'image/svg+xml' for product in seeded)
        assert [name for name, _, _ in rows[:2]] == ['قهوة عادية', 'قهوة دبل']
