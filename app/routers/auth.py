from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginAccountOut, LoginRequest, RecoverAdminRequest, TokenOut, UserOut
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login-accounts", response_model=list[LoginAccountOut])
def login_accounts(db: Session = Depends(get_db)) -> list[LoginAccountOut]:
    return auth_service.list_login_accounts(db)


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    return auth_service.login(db, body.username, body.password)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    auth_service.change_password(db, user, body)


@router.post("/recover-admin", status_code=status.HTTP_204_NO_CONTENT)
def recover_admin(body: RecoverAdminRequest, request: Request, db: Session = Depends(get_db)) -> None:
    auth_service.recover_admin(db, body, request.client.host if request.client else "unknown")
