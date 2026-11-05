from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.utils.money import dirhams_to_lyd
from app.utils.time import utc_now


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(32))
    payee_name: Mapped[str] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(String(240), default=None)
    amount_dirhams: Mapped[int] = mapped_column()
    paid_from: Mapped[str] = mapped_column(String(16))
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), index=True, default=None)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    @property
    def amount_lyd(self) -> Decimal:
        return dirhams_to_lyd(self.amount_dirhams)
