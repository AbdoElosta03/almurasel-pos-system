import sqlite3

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db, make_engine
from app.main import app
from app.services import backups
from app.services.users import seed_admin


def test_restore_saved_and_uploaded_backup(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    engine = make_engine(f"sqlite:///{(tmp_path / 'live.db').as_posix()}")
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
        conn.execute(text("INSERT INTO alembic_version VALUES ('test-revision')"))
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    with factory() as db:
        seed_admin(db)

    def get_test_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = get_test_db
    try:
        with TestClient(app) as client:
            login = client.post('/api/auth/login', json={"username": settings.admin_username, "password": settings.admin_password})
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            backup = client.post('/api/backups', headers=headers).json()
            downloaded = client.get(f"/api/backups/{backup['filename']}/download", headers=headers).content
            client.post('/api/categories', headers=headers, json={"name": "After backup"})

            bad_password = client.post(
                f"/api/backups/{backup['filename']}/restore", headers=headers, json={"password": "wrong"}
            )
            assert bad_password.status_code == 403
            assert client.get('/api/categories', headers=headers).json()
            invalid = client.post('/api/backups/restore-upload', headers={**headers, 'X-Restore-Password': settings.admin_password}, content=b'not sqlite')
            assert invalid.status_code == 400
            incompatible = tmp_path / 'incompatible.db'
            incompatible.write_bytes(downloaded)
            with sqlite3.connect(incompatible) as copy:
                copy.execute("UPDATE alembic_version SET version_num='old-version'")
            mismatch = client.post(
                '/api/backups/restore-upload',
                headers={**headers, 'X-Restore-Password': settings.admin_password},
                content=incompatible.read_bytes(),
            )
            assert mismatch.status_code == 400
            assert mismatch.json()['code'] == 'backup_version_mismatch'
            assert client.get('/api/categories', headers=headers).json()

            restored = client.post(
                f"/api/backups/{backup['filename']}/restore",
                headers=headers,
                json={"password": settings.admin_password},
            )
            assert restored.status_code == 200, restored.text
            safety = restored.json()['safety_backup']
            assert safety['kind'] == 'safety'
            assert backups.backup_path(safety['filename']).is_file()
            assert client.get('/api/categories', headers=headers).status_code == 401
            fresh = client.post('/api/auth/login', json={"username": settings.admin_username, "password": settings.admin_password})
            fresh_headers = {"Authorization": f"Bearer {fresh.json()['access_token']}"}
            assert client.get('/api/categories', headers=fresh_headers).json() == []

            client.post('/api/categories', headers=fresh_headers, json={"name": "After restore"})
            uploaded = client.post(
                '/api/backups/restore-upload',
                headers={**fresh_headers, 'X-Restore-Password': settings.admin_password, 'Content-Type': 'application/octet-stream'},
                content=downloaded,
            )
            assert uploaded.status_code == 200, uploaded.text
            assert client.get('/api/categories', headers=fresh_headers).status_code == 401
            new_login = client.post('/api/auth/login', json={"username": settings.admin_username, "password": settings.admin_password})
            assert client.get('/api/categories', headers={"Authorization": f"Bearer {new_login.json()['access_token']}"}).json() == []
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
