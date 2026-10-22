from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.core.password_policy import PIN_MAX_LENGTH, PIN_MIN_LENGTH

NumericPin = Annotated[str, Field(min_length=PIN_MIN_LENGTH, max_length=PIN_MAX_LENGTH, pattern=r"^\d+$")]


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=PIN_MAX_LENGTH)
    new_password: NumericPin
    confirm_new_password: NumericPin


class RecoverAdminRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    recovery_key: str = Field(min_length=1)
    new_password: NumericPin
    confirm_new_password: NumericPin


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class LoginAccountOut(BaseModel):
    username: str
    role: str


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: NumericPin
    role: str = Field(pattern="^(admin|cashier)$")


class UserUpdate(BaseModel):
    password: NumericPin | None = None
    role: str | None = Field(default=None, pattern="^(admin|cashier)$")
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    is_active: bool
