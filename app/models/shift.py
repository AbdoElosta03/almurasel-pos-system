from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.utils.money import dirhams_to_lyd
from app.utils.time import utc_now


class Shift(Base):
    __tablename__ = "shifts"
    __table_args__ = (
        Index(
            "uq_open_shift_per_cashier",
            "cashier_id",
            unique=True,
            sqlite_where=text("status = 'open'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    cashier_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(16), default="open")
    opening_cash_dirhams: Mapped[int] = mapped_column()
    closing_cash_dirhams: Mapped[int | None] = mapped_column(default=None)
    opened_at: Mapped[datetime] = mapped_column(default=utc_now)
    closed_at: Mapped[datetime | None] = mapped_column(default=None)
    counted_cash_dirhams: Mapped[int | None] = mapped_column(default=None)
    reconciled_cash_sales_dirhams: Mapped[int | None] = mapped_column(default=None)
    reconciled_card_sales_dirhams: Mapped[int | None] = mapped_column(default=None)
    reconciled_at: Mapped[datetime | None] = mapped_column(default=None)
    reconciled_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    @property
    def opening_cash_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.opening_cash_dirhams)

    @property
    def closing_cash_lyd(self) -> Decimal | None:
        if self.closing_cash_dirhams is None:
            return None
        return dirhams_to_lyd(self.closing_cash_dirhams)
