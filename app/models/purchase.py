from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.money import dirhams_to_lyd
from app.utils.time import utc_now


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_name: Mapped[str | None] = mapped_column(String(120))
    purchase_date: Mapped[date] = mapped_column(Date, index=True)
    total_dirhams: Mapped[int] = mapped_column(default=0)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def total_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.total_dirhams)


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    item_name: Mapped[str] = mapped_column(String(120))
    quantity_milli: Mapped[int] = mapped_column()
    line_total_dirhams: Mapped[int] = mapped_column()

    purchase: Mapped[Purchase] = relationship(back_populates="items")

    @property
    def qty(self) -> Decimal:
        return Decimal(self.quantity_milli) / 1000

    @property
    def line_total_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.line_total_dirhams)
