"""Store the admin drawer count for a closed shift.

Revision ID: e7a1c44b9d18
Revises: d5e9f71a3c02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7a1c44b9d18"
down_revision: Union[str, Sequence[str], None] = "d5e9f71a3c02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing = {row[1] for row in op.get_bind().execute(sa.text("PRAGMA table_info(shifts)"))}
    columns = (
        ("counted_cash_dirhams", sa.Integer()),
        ("reconciled_cash_sales_dirhams", sa.Integer()),
        ("reconciled_card_sales_dirhams", sa.Integer()),
        ("reconciled_at", sa.DateTime()),
        ("reconciled_by", sa.Integer()),
    )
    for name, column_type in columns:
        if name not in existing:
            op.add_column("shifts", sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    op.drop_column("shifts", "reconciled_by")
    op.drop_column("shifts", "reconciled_at")
    op.drop_column("shifts", "reconciled_card_sales_dirhams")
    op.drop_column("shifts", "reconciled_cash_sales_dirhams")
    op.drop_column("shifts", "counted_cash_dirhams")
