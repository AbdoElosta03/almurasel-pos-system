from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.money import dirhams_to_lyd
from app.utils.time import utc_now


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"), index=True)
    cashier_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    payment_method: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16), default="completed", index=True)
    total_dirhams: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(default=None)
    cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def total_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.total_dirhams)


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(80))
    unit_price_dirhams: Mapped[int] = mapped_column()
    qty: Mapped[int] = mapped_column()
    line_total_dirhams: Mapped[int] = mapped_column()

    sale: Mapped[Sale] = relationship(back_populates="items")

    @property
    def unit_price_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.unit_price_dirhams)

    @property
    def line_total_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.line_total_dirhams)
