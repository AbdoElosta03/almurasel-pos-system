from decimal import Decimal

from sqlalchemy import ForeignKey, LargeBinary, String
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
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    image_content_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    category: Mapped[Category] = relationship()

    @property
    def price_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.price_dirhams)

    @property
    def image_url(self) -> str | None:
        return f"/api/products/{self.id}/image" if self.image_content_type else None
