import jwt
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise api_error(status.HTTP_401_UNAUTHORIZED, "invalid_token", "Invalid token") from None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise api_error(status.HTTP_401_UNAUTHORIZED, "invalid_token", "Invalid token")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise api_error(status.HTTP_403_FORBIDDEN, "admin_only", "Admin only")
    return user


def require_cashier(user: User = Depends(get_current_user)) -> User:
    if user.role != "cashier":
        raise api_error(status.HTTP_403_FORBIDDEN, "cashier_only", "Cashier only")
    return user
