from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def list_logs(db: Session) -> list[AuditLog]:
    return list(db.scalars(select(AuditLog).order_by(AuditLog.id.desc())).all())
