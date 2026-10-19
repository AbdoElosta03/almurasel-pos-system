from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import TokenOut


def login(db: Session, username: str, password: str) -> TokenOut:
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise api_error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Incorrect username or password")
    return TokenOut(access_token=create_access_token(user.id, user.role), role=user.role)
