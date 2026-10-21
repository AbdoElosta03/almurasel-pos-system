from fastapi import status
import secrets

from app.core.errors import api_error
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.sale import Sale
from app.models.shift import Shift
from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate


def seed_admin(db: Session) -> None:
    existing = db.scalar(select(User.id).limit(1))
    if existing is not None:
        return
    db.add(
        User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            is_active=True,
        )
    )
    db.commit()


def create_user(db: Session, body: UserCreate) -> User:
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
        token_version=secrets.randbelow(2**31 - 1) + 1,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "username_exists", "Username already exists") from None
    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)).all())


def update_user(db: Session, user_id: int, body: UserUpdate) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "user_not_found", "User not found")
    if body.password is not None:
        user.password_hash = hash_password(body.password)
        user.token_version += 1
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "username_exists", "Username already exists") from None
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, actor: User) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "user_not_found", "User not found")
    if user.id == actor.id:
        raise api_error(status.HTTP_409_CONFLICT, "cannot_delete_self", "You cannot delete your own account")
    if user.role == "admin":
        other_admin = db.scalar(
            select(User.id).where(User.role == "admin", User.id != user_id, User.is_active.is_(True)).limit(1)
        )
        if other_admin is None:
            raise api_error(status.HTTP_409_CONFLICT, "cannot_delete_last_admin", "The last active admin cannot be deleted")
    used = db.scalar(select(Shift.id).where(Shift.cashier_id == user_id).limit(1)) is not None
    used = used or db.scalar(select(Sale.id).where(Sale.cashier_id == user_id).limit(1)) is not None
    used = used or db.scalar(select(Sale.id).where(Sale.cancelled_by == user_id).limit(1)) is not None
    if used:
        raise api_error(
            status.HTTP_409_CONFLICT,
            "user_used_in_sales",
            "User cannot be deleted because they are linked to shifts or sales",
        )
    db.delete(user)
    db.commit()
