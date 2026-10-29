from decimal import Decimal

from sqlalchemy import select

from app.models.category import Category
from app.models.product import Product
from app.services.seed import PRODUCT_IMAGE_FILES, seed_cashiers, seed_catalog
from app.models.user import User
from app.core.security import hash_password, verify_password


def test_seed_catalog_products_prices_and_idempotence(session_factory):
    expected = {
        'قهوة عادية': ('قهوة', 3),
        'قهوة دبل': ('قهوة', 5),
        'نسكافيه عادي': ('قهوة', 3),
        'نسكافيه تام': ('قهوة', 6),
        'كابتشينو طلياني': ('قهوة', 4),
        'شاهي مغربي': ('قهوة', 3),
        'قهوة عربيه': ('قهوة', 4),
        'بريوش نوتيلا كامل': ('حلويات', 6),
        'بريوش جبنه وزعتر': ('حلويات', 7),
        'بسبوسة الغزال': ('حلويات', 6),
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
        'كنفركس': ('قهوة', 6),
        'بسبوسه عادي': ('حلويات', 3),
        'كلير': ('حلويات', 3),
        'كيكا حمره': ('حلويات', 6),
        'شاي كيس': ('قهوة', Decimal('1.5')),
        'شاهي كيس ': ('قهوة', Decimal('1.5')),
        'كيكا كرميل': ('حلويات', 7),
        'سبسيال': ('قهوة', 4),
        'سبسيال دبل': ('قهوة', 8),
        'سندوتش شوفان': ('سندوتشات', 9),
        'XR': ('مشروبات', 5),
        'عصير ندئ': ('مشروبات', 3),
        'عصير نسيم': ('مشروبات', 3),
        'كيكا عادي': ('حلويات', 2),
    }

    with session_factory() as db:
        seed_catalog(db)
        rows = db.execute(select(Product.name, Category.name, Product.price_dirhams).join(Category).order_by(Product.id)).all()
        assert {name: (category, Decimal(price) / 1000) for name, category, price in rows} == expected
        assert all(price == expected[name][1] * 1000 for name, _, price in rows)
        assert len(db.scalars(select(Category)).all()) == 5

        product = db.scalar(select(Product).where(Product.name == 'سموذي'))
        product.price_dirhams = 12_000
        db.commit()
        seed_catalog(db)
        assert db.scalar(select(Product.price_dirhams).where(Product.name == 'سموذي')) == 12_000
        seeded = db.scalars(select(Product)).all()
        assert len(seeded) == 38
        for product in seeded:
            if product.name in PRODUCT_IMAGE_FILES:
                assert product.image_data and product.image_content_type == 'image/svg+xml'
            else:
                assert product.image_data is None and product.image_content_type is None
        assert [name for name, _, _ in rows[:2]] == ['قهوة عادية', 'قهوة دبل']
        coffee = [row for row in rows if row[1] == 'قهوة']
        desserts = [row for row in rows if row[1] == 'حلويات']
        sandwiches = [row for row in rows if row[1] == 'سندوتشات']
        water_index = len(coffee)
        assert rows[:water_index] == coffee
        assert rows[water_index][0] == 'قنينة ماء'
        desserts_start = water_index + 1
        assert rows[desserts_start:desserts_start + len(desserts)] == desserts
        sandwiches_start = desserts_start + len(desserts)
        assert rows[sandwiches_start:sandwiches_start + len(sandwiches)] == sandwiches


def test_seed_cashiers_credentials_and_idempotence(session_factory):
    with session_factory() as db:
        seed_cashiers(db)
        users = list(db.scalars(select(User).order_by(User.id)))
        assert [user.username for user in users] == ['حسن', 'عوض']
        for user, pin in zip(users, ('12345678', '12345')):
            assert user.role == 'cashier'
            assert user.is_active
            assert user.password_hash != pin
            assert verify_password(pin, user.password_hash)

        users[0].password_hash = hash_password('98765432')
        users[0].is_active = False
        db.commit()
        seed_cashiers(db)
        assert len(list(db.scalars(select(User)))) == 2
        assert verify_password('98765432', users[0].password_hash)
        assert not users[0].is_active


def test_seed_cashiers_preserves_existing_account_and_adds_missing(session_factory):
    with session_factory() as db:
        db.add(User(username='حسن', password_hash=hash_password('99999'), role='admin', is_active=True))
        db.commit()
        seed_cashiers(db)
        hassan = db.scalar(select(User).where(User.username == 'حسن'))
        assert hassan.role == 'admin'
        assert verify_password('99999', hassan.password_hash)
        assert db.scalar(select(User).where(User.username == 'عوض')).role == 'cashier'
