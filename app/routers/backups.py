from datetime import datetime
import tempfile
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.errors import api_error
from app.core.security import verify_password
from app.db.session import get_db
from app.models.user import User
from app.services import backups
from app.services.database_reset import reset_database

router = APIRouter(prefix="/backups", tags=["backups"], dependencies=[Depends(require_admin)])


class BackupOut(BaseModel):
    filename: str
    kind: str
    created_at: datetime
    size_bytes: int


class RestoreRequest(BaseModel):
    password: str


class ResetRequest(BaseModel):
    password: str
    confirmation: str


def _confirm(password: str, user: User) -> None:
    if not verify_password(password, user.password_hash):
        raise api_error(403, "invalid_password", "Incorrect administrator password")


def _restore(db: Session, source: Path) -> dict:
    engine = db.get_bind()
    db.close()  # Release the authentication connection before SQLite replaces the database.
    try:
        return backups.restore(engine, source)
    except backups.InvalidBackup as exc:
        raise api_error(400, exc.code, str(exc)) from exc
    except (OSError, ValueError, RuntimeError, sqlite3.DatabaseError) as exc:
        raise api_error(500, "restore_failed", "Could not restore database") from exc


@router.get("", response_model=list[BackupOut])
def list_saved_backups():
    return backups.list_backups()


@router.post("", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
def create_backup(db: Session = Depends(get_db)):
    try:
        return backups.create_manual(db.get_bind())
    except (OSError, ValueError, RuntimeError) as exc:
        raise api_error(500, "backup_failed", "Could not create backup") from exc


@router.get("/{filename}/download")
def download_backup(filename: str):
    try:
        path = backups.backup_path(filename)
    except (ValueError, FileNotFoundError):
        raise api_error(404, "backup_not_found", "Backup not found") from None
    return FileResponse(path, media_type="application/vnd.sqlite3", filename=path.name)


@router.post("/restore-upload")
async def restore_uploaded_backup(
    request: Request,
    password: str = Header(alias="X-Restore-Password"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    _confirm(password, admin)
    folder = backups.directory()
    folder.mkdir(parents=True, exist_ok=True)
    # Stream the raw .db body instead of loading an entire backup into RAM.
    with tempfile.NamedTemporaryFile(dir=folder, suffix=".upload", delete=False) as file:
        temporary = Path(file.name)
    try:
        with temporary.open("wb") as file:
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 512 * 1024 * 1024:
                    raise api_error(413, "backup_too_large", "Backup exceeds 512 MB")
                file.write(chunk)
        return {"safety_backup": _restore(db, temporary)}
    finally:
        temporary.unlink(missing_ok=True)


@router.post("/{filename}/restore")
def restore_saved_backup(
    filename: str,
    body: RestoreRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    _confirm(body.password, admin)
    try:
        source = backups.backup_path(filename)
    except (ValueError, FileNotFoundError):
        raise api_error(404, "backup_not_found", "Backup not found") from None
    return {"safety_backup": _restore(db, source)}


@router.post("/reset")
def reset_all_data(body: ResetRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    _confirm(body.password, admin)
    if body.confirmation != "حذف البيانات":
        raise api_error(400, "reset_confirmation_required", "Type the confirmation phrase")
    engine = db.get_bind()
    admin_id = admin.id
    db.close()
    try:
        return {"safety_backup": reset_database(engine, admin_id)}
    except (OSError, ValueError, RuntimeError, sqlite3.DatabaseError) as exc:
        raise api_error(500, "reset_failed", "Could not reset database") from exc
