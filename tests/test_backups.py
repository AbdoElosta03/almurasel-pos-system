import sqlite3
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.services import backups


def test_manual_backup_contains_data_and_is_admin_only(client, admin_headers, cashier_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    assert client.post("/api/backups", headers=cashier_headers).status_code == 403
    assert client.get("/api/backups").status_code in (401, 403)

    response = client.post("/api/backups", headers=admin_headers)
    assert response.status_code == 201, response.text
    saved = response.json()
    assert saved["kind"] == "manual"
    with sqlite3.connect(backups.backup_path(saved["filename"])) as copy:
        assert copy.execute("SELECT username FROM users WHERE role = 'admin'").fetchone() == (settings.admin_username,)
        assert copy.execute("PRAGMA integrity_check").fetchone() == ("ok",)

    listed = client.get("/api/backups", headers=admin_headers)
    assert listed.status_code == 200
    assert listed.json() == [saved]
    downloaded = client.get(f"/api/backups/{saved['filename']}/download", headers=admin_headers)
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"SQLite format 3")
    assert client.get("/api/backups/..%2Fpos.db/download", headers=admin_headers).status_code != 200
    assert client.get("/api/backups/no.db/download", headers=admin_headers).status_code == 404


def test_auto_due_every_twenty_days_independent_of_manual(session_factory, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    engine = session_factory.kw["bind"]
    first = backups.create_auto_if_due(engine)
    assert first is not None
    assert backups.create_auto_if_due(engine) is None
    backups.create_manual(engine)
    old_timestamp = (datetime.now(timezone.utc) - timedelta(days=21)).strftime("%Y%m%dT%H%M%SZ")
    old_filename = first["filename"].replace(first["filename"].split("-")[1], old_timestamp)
    backups.backup_path(first["filename"]).rename(tmp_path / "backups" / old_filename)
    second = backups.create_auto_if_due(engine)
    assert second is not None
    assert second["filename"] != old_filename
    assert backups.create_auto_if_due(engine) is None
    assert len(backups.list_backups()) == 3
