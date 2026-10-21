from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lyd import LydAmount


class ProductCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=80)
    price_lyd: Decimal = Field(gt=0)


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=80)
    price_lyd: Decimal | None = Field(default=None, gt=0)
    is_active: bool | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    price_lyd: LydAmount
    is_active: bool
    image_url: str | None
