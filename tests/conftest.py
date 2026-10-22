import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

settings.seed_on_startup = False
settings.backup_auto_enabled = False

from app.db.base import Base
from app.db.session import get_db, make_engine
from app.main import app
from app.services.users import seed_admin


@pytest.fixture
def session_factory():
    engine = make_engine("sqlite:///:memory:", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with session_factory() as db:
        seed_admin(db)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={"username": settings.admin_username, "password": settings.admin_password},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def cashier_headers(client: TestClient, admin_headers):
    created = client.post(
        "/api/users",
        headers=admin_headers,
        json={"username": "cashier1", "password": "12345678", "role": "cashier"},
    )
    assert created.status_code == 201, created.text
    response = client.post("/api/auth/login", json={"username": "cashier1", "password": "12345678"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def product(client: TestClient, admin_headers):
    category = client.post("/api/categories", headers=admin_headers, json={"name": "Drinks"})
    assert category.status_code == 201, category.text
    created = client.post(
        "/api/products",
        headers=admin_headers,
        json={"category_id": category.json()["id"], "name": "Tea", "price_lyd": 0.5},
    )
    assert created.status_code == 201, created.text
    return created.json()
