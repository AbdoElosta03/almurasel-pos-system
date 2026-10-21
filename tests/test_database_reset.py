import sqlite3

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models import AuditLog, Category, Product, Purchase, PurchaseItem, Sale, SaleItem, Shift, User
from app.services import backups
from app.services import database_reset
from app.services.seed import CATEGORY_NAMES, CATALOG_PRODUCTS


def test_reset_preserves_admin_and_backups_then_seeds_catalog(
    client, admin_headers, cashier_headers, session_factory, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    with session_factory() as db:
        admin = db.scalar(select(User).where(User.role == "admin"))
        admin_id, admin_hash = admin.id, admin.password_hash

    assert client.post('/api/users', headers=admin_headers, json={
        'username': 'second-admin', 'password': 'secret123', 'role': 'admin',
    }).status_code == 201
    category = client.post('/api/categories', headers=admin_headers, json={'name': 'Custom'}).json()
    product = client.post('/api/products', headers=admin_headers, json={
        'category_id': category['id'], 'name': 'Custom product', 'price_lyd': 3,
    }).json()
    assert client.post('/api/shifts/open', headers=cashier_headers, json={'opening_cash_lyd': 0}).status_code == 201
    assert client.post('/api/sales', headers=cashier_headers, json={
        'payment_method': 'cash', 'items': [{'product_id': product['id'], 'qty': 1}],
    }).status_code == 201
    assert client.post('/api/purchases', headers=admin_headers, json={
        'purchase_date': '2026-10-20', 'items': [{'item_name': 'Beans', 'qty': 1, 'line_total_lyd': 5}],
    }).status_code == 201

    url = '/api/backups/reset'
    assert client.post(url, headers=cashier_headers, json={'password': settings.admin_password, 'confirmation': 'حذف البيانات'}).status_code == 403
    assert client.post(url, headers=admin_headers, json={'password': 'wrong', 'confirmation': 'حذف البيانات'}).status_code == 403
    assert client.post(url, headers=admin_headers, json={'password': settings.admin_password, 'confirmation': 'wrong'}).status_code == 400
    assert backups.list_backups() == []

    result = client.post(url, headers=admin_headers, json={
        'password': settings.admin_password, 'confirmation': 'حذف البيانات',
    })
    assert result.status_code == 200, result.text
    safety = result.json()['safety_backup']
    assert safety['kind'] == 'safety'
    with sqlite3.connect(backups.backup_path(safety['filename'])) as snapshot:
        assert snapshot.execute('SELECT COUNT(*) FROM sales').fetchone()[0] == 1
        assert snapshot.execute('SELECT COUNT(*) FROM purchases').fetchone()[0] == 1
        assert snapshot.execute('SELECT COUNT(*) FROM users').fetchone()[0] == 3

    with session_factory() as db:
        users = db.scalars(select(User)).all()
        assert len(users) == 1
        assert (users[0].id, users[0].password_hash, users[0].role) == (admin_id, admin_hash, 'admin')
        assert {category.name for category in db.scalars(select(Category))} == set(CATEGORY_NAMES)
        assert {product.name for product in db.scalars(select(Product))} == {row[0] for row in CATALOG_PRODUCTS}
        for model in (Sale, SaleItem, Purchase, PurchaseItem, Shift, AuditLog):
            assert db.scalar(select(func.count()).select_from(model)) == 0

    assert client.get('/api/categories', headers=admin_headers).status_code == 401
    assert client.get('/api/shifts/current', headers=cashier_headers).status_code == 401
    assert client.post('/api/auth/login', json={'username': 'second-admin', 'password': 'secret123'}).status_code == 401
    login = client.post('/api/auth/login', json={
        'username': settings.admin_username, 'password': settings.admin_password,
    })
    assert login.status_code == 200
    new_headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
    assert client.get('/api/backups', headers=new_headers).json()[0]['filename'] == safety['filename']

    # A newly created user must not inherit a deleted cashier's bearer token.
    assert client.post('/api/users', headers=new_headers, json={
        'username': 'new-cashier', 'password': 'newpass123', 'role': 'cashier',
    }).status_code == 201
    assert client.get('/api/auth/me', headers=cashier_headers).status_code == 401


def test_reset_rolls_back_if_seed_fails(session_factory, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    engine = session_factory.kw['bind']
    with session_factory() as db:
        db.add(User(username='keeper', password_hash='hash', role='admin', is_active=True))
        db.add(Category(name='Original', is_active=True))
        db.commit()
        admin_id = db.scalar(select(User.id))

    def fail_seed(_db, *, commit):
        raise RuntimeError('simulated seeder error')

    monkeypatch.setattr(database_reset, 'seed_catalog', fail_seed)
    with pytest.raises(RuntimeError, match='simulated seeder error'):
        database_reset.reset_database(engine, admin_id)

    with session_factory() as db:
        assert db.scalar(select(Category.name)) == 'Original'
        assert db.scalar(select(User.token_version)) == 0
    assert len(backups.list_backups()) == 1
