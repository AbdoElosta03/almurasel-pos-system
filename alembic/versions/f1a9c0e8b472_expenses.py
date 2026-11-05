"""Add an expenses ledger separate from purchases.

Revision ID: f1a9c0e8b472
Revises: e7a1c44b9d18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a9c0e8b472"
down_revision: Union[str, Sequence[str], None] = "e7a1c44b9d18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("payee_name", sa.String(length=120), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("amount_dirhams", sa.Integer(), nullable=False),
        sa.Column("paid_from", sa.String(length=16), nullable=False),
        sa.Column("shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])
    op.create_index("ix_expenses_shift_id", "expenses", ["shift_id"])


def downgrade() -> None:
    op.drop_index("ix_expenses_shift_id", table_name="expenses")
    op.drop_index("ix_expenses_expense_date", table_name="expenses")
    op.drop_table("expenses")
