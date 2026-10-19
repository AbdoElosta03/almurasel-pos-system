from decimal import Decimal

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.category import Category
from app.utils.money import dirhams_to_lyd


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(80))
    price_dirhams: Mapped[int] = mapped_column()
    is_active: Mapped[bool] = mapped_column(default=True)

    category: Mapped[Category] = relationship()

    @property
    def price_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.price_dirhams)
