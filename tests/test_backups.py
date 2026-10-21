import sqlite3
from contextlib import closing
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
    with closing(sqlite3.connect(backups.backup_path(saved["filename"]))) as copy:
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

    newer = client.post("/api/backups", headers=admin_headers)
    assert newer.status_code == 201, newer.text
    assert newer.json()["filename"] != saved["filename"]
    assert client.get("/api/backups", headers=admin_headers).json() == [newer.json()]
    assert client.get(f"/api/backups/{saved['filename']}/download", headers=admin_headers).status_code == 404


def test_auto_due_every_twenty_days_since_latest_backup(session_factory, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    engine = session_factory.kw["bind"]
    first = backups.create_auto_if_due(engine)
    assert first is not None
    assert backups.create_auto_if_due(engine) is None
    manual = backups.create_manual(engine)
    assert len(backups.list_backups()) == 1
    assert not (tmp_path / "backups" / first["filename"]).exists()
    assert backups.create_auto_if_due(engine) is None
    old_timestamp = (datetime.now(timezone.utc) - timedelta(days=21)).strftime("%Y%m%dT%H%M%SZ")
    old_filename = manual["filename"].replace(manual["filename"].split("-")[1], old_timestamp)
    backups.backup_path(manual["filename"]).rename(tmp_path / "backups" / old_filename)
    second = backups.create_auto_if_due(engine)
    assert second is not None
    assert second["filename"] != old_filename
    assert backups.create_auto_if_due(engine) is None
    assert [item["filename"] for item in backups.list_backups()] == [second["filename"]]


def test_failed_backup_preserves_previous_snapshot(session_factory, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    engine = session_factory.kw["bind"]
    previous = backups.create_manual(engine)

    def fail(*_args):
        raise RuntimeError("disk full")

    monkeypatch.setattr(backups, "_create", fail)
    try:
        backups.create_manual(engine)
    except RuntimeError:
        pass
    else:
        raise AssertionError("Expected backup failure")
    assert backups.backup_path(previous["filename"]).is_file()
