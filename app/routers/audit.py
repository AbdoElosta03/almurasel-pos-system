from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.schemas.audit import AuditLogOut
from app.services import audit as audit_service

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_logs(db: Session = Depends(get_db), _: object = Depends(require_admin)):
    return audit_service.list_logs(db)
