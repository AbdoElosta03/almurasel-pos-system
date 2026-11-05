from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def list_logs(db: Session) -> list[dict]:
    rows = db.execute(
        select(AuditLog, User.username)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .order_by(AuditLog.id.desc())
    ).all()
    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_username": username or "",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "created_at": log.created_at,
        }
        for log, username in rows
    ]
