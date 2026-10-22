import hmac
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginAccountOut, RecoverAdminRequest, TokenOut

_recovery_attempts: dict[str, deque[float]] = defaultdict(deque)
_recovery_lock = Lock()
_recovery_window_seconds = 15 * 60
_recovery_max_attempts = 5


def _check_recovery_limit(client_ip: str) -> None:
    with _recovery_lock:
        attempts = _recovery_attempts[client_ip]
        now = time.monotonic()
        while attempts and now - attempts[0] >= _recovery_window_seconds:
            attempts.popleft()
        if len(attempts) >= _recovery_max_attempts:
            raise api_error(status.HTTP_429_TOO_MANY_REQUESTS, "recovery_rate_limited", "Try again later")


def _record_failed_recovery(client_ip: str) -> None:
    with _recovery_lock:
        _recovery_attempts[client_ip].append(time.monotonic())


def list_login_accounts(db: Session) -> list[LoginAccountOut]:
    users = db.scalars(
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.role.desc(), User.username.asc())
    ).all()
    return [LoginAccountOut(username=user.username, role=user.role) for user in users]


def login(db: Session, username: str, password: str) -> TokenOut:
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise api_error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Incorrect username or password")
    return TokenOut(access_token=create_access_token(user.id, user.role, user.token_version), role=user.role)


def change_password(db: Session, user: User, body: ChangePasswordRequest) -> None:
    if body.new_password != body.confirm_new_password:
        raise api_error(status.HTTP_400_BAD_REQUEST, "password_confirmation_mismatch", "New passwords do not match")
    if not verify_password(body.current_password, user.password_hash):
        raise api_error(status.HTTP_400_BAD_REQUEST, "incorrect_current_password", "Current password is incorrect")

    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.commit()


def recover_admin(db: Session, body: RecoverAdminRequest, client_ip: str) -> None:
    key = settings.admin_recovery_key
    if key is None or len(key) < 8:
        raise api_error(status.HTTP_503_SERVICE_UNAVAILABLE, "recovery_unavailable", "Admin recovery is not configured")

    _check_recovery_limit(client_ip)
    user = db.scalar(select(User).where(User.username == body.username, User.role == "admin", User.is_active.is_(True)))
    if user is None or not hmac.compare_digest(body.recovery_key.encode(), key.encode()):
        _record_failed_recovery(client_ip)
        raise api_error(status.HTTP_403_FORBIDDEN, "invalid_recovery_credentials", "Invalid recovery credentials")
    if body.new_password != body.confirm_new_password:
        raise api_error(status.HTTP_400_BAD_REQUEST, "password_confirmation_mismatch", "New passwords do not match")

    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.commit()
    with _recovery_lock:
        _recovery_attempts.pop(client_ip, None)
