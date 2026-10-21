"""Consistent SQLite snapshots for manual and scheduled backups."""

import os
import re
import sqlite3
import threading
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.engine import Engine

from app.core.config import settings

INTERVAL = timedelta(days=20)
NAME = re.compile(r"^(manual|auto|safety)-(\d{8}T\d{6}Z)-([0-9a-f]{8})\.db$")
_lock = threading.Lock()


def directory() -> Path:
    return Path(settings.backup_dir).resolve()


def _info(path: Path) -> dict:
    match = NAME.fullmatch(path.name)
    if match is None:
        raise ValueError("Invalid backup name")
    return {
        "filename": path.name,
        "kind": match.group(1),
        "created_at": datetime.strptime(match.group(2), "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc),
        "size_bytes": path.stat().st_size,
    }


def list_backups() -> list[dict]:
    folder = directory()
    if not folder.exists():
        return []
    return sorted(
        (_info(path) for path in folder.iterdir() if path.is_file() and NAME.fullmatch(path.name)),
        key=lambda item: item["created_at"],
        reverse=True,
    )


def backup_path(filename: str) -> Path:
    if not NAME.fullmatch(filename):
        raise ValueError("Invalid backup name")
    path = directory() / filename
    if not path.is_file() or path.is_symlink():
        raise FileNotFoundError(filename)
    return path


def _create(engine: Engine, kind: str) -> dict:
    if engine.dialect.name != "sqlite":
        raise ValueError("Backups require SQLite")
    folder = directory()
    folder.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"{kind}-{timestamp}-{os.urandom(4).hex()}.db"
    target = folder / filename
    temporary = folder / f".{filename}.tmp"
    try:
        # SQLite's online backup API takes a transactionally consistent snapshot, even with active sales.
        with engine.raw_connection() as original:
            with closing(sqlite3.connect(temporary)) as copy:
                original.driver_connection.backup(copy)
                if copy.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise RuntimeError("Backup integrity check failed")
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    return _info(target)


def _keep_only(filename: str) -> None:
    """Remove older managed snapshots only after the replacement is safely written."""
    for path in directory().iterdir():
        if path.name != filename and NAME.fullmatch(path.name) and path.is_file() and not path.is_symlink():
            path.unlink()


def create_manual(engine: Engine) -> dict:
    with _lock:
        saved = _create(engine, "manual")
        _keep_only(saved["filename"])
        return saved


def create_auto_if_due(engine: Engine, now: datetime | None = None) -> dict | None:
    with _lock:
        now = now or datetime.now(timezone.utc)
        # A newer manual or safety snapshot also counts: deleting the old auto
        # snapshot must not trigger another backup at every hourly check.
        latest = next(iter(list_backups()), None)
        if latest and now - latest["created_at"] < INTERVAL:
            return None
        saved = _create(engine, "auto")
        _keep_only(saved["filename"])
        return saved


class InvalidBackup(ValueError):
    def __init__(self, message: str, code: str = "invalid_backup"):
        super().__init__(message)
        self.code = code


def _revision(connection: sqlite3.Connection) -> str:
    try:
        row = connection.execute("SELECT version_num FROM alembic_version").fetchone()
    except sqlite3.DatabaseError as exc:
        raise InvalidBackup("The database has no schema version") from exc
    if not row:
        raise InvalidBackup("The database has no schema version")
    return row[0]


def _schema(connection: sqlite3.Connection) -> list[tuple]:
    return connection.execute(
        "SELECT type, name, tbl_name, sql FROM sqlite_master "
        "WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
    ).fetchall()


def _validate(source: Path, expected_revision: str, expected_schema: list[tuple]) -> None:
    if not source.is_file() or source.stat().st_size < 100:
        raise InvalidBackup("Not a SQLite backup")
    try:
        with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as connection:
            connection.execute("PRAGMA trusted_schema=OFF")
            if connection.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise InvalidBackup("Database integrity check failed")
            if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
                raise InvalidBackup("Database has broken relationships")
            if _revision(connection) != expected_revision:
                raise InvalidBackup("Backup version does not match the current database", "backup_version_mismatch")
            if _schema(connection) != expected_schema:
                raise InvalidBackup("Backup schema does not match the current database", "backup_schema_mismatch")
            if connection.execute("SELECT 1 FROM users WHERE role='admin' AND is_active=1 LIMIT 1").fetchone() is None:
                raise InvalidBackup("Backup has no active administrator")
    except sqlite3.DatabaseError as exc:
        raise InvalidBackup("Invalid SQLite backup") from exc


def restore(engine: Engine, source: Path) -> dict:
    """Validate and restore a snapshot; keep a safety backup of the current state."""
    if engine.dialect.name != "sqlite" or not engine.url.database or engine.url.database == ":memory:":
        raise ValueError("Restore requires a file-based SQLite database")
    with _lock:
        # Never replace the database file: SQLite handles WAL and Windows file locks itself.
        target = Path(engine.url.database).resolve()
        with closing(sqlite3.connect(target)) as current:
            expected_revision = _revision(current)
            expected_schema = _schema(current)
        _validate(source, expected_revision, expected_schema)
        safety_copy = _create(engine, "safety")
        engine.dispose()
        try:
            with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as original:
                with closing(sqlite3.connect(target)) as destination:
                    original.backup(destination)
                    # Old bearer tokens must not silently become valid for restored accounts.
                    destination.execute("UPDATE users SET token_version = token_version + ?", (int.from_bytes(os.urandom(4), "big") + 1,))
                    destination.commit()
        except Exception:
            # Restore the original state if the replacement failed midway.
            with closing(sqlite3.connect(backup_path(safety_copy["filename"]))) as original:
                with closing(sqlite3.connect(target)) as destination:
                    original.backup(destination)
            raise
        finally:
            engine.dispose()
        # The source can itself be an older saved backup. Do not delete it until
        # the restore has completed, nor delete the safety copy on failure.
        _keep_only(safety_copy["filename"])
        return safety_copy
