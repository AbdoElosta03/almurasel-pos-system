"""Add purchase invoices and their items.

Revision ID: c4a8d63e2b91
Revises: b3f7c92d1a04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a8d63e2b91"
down_revision: Union[str, Sequence[str], None] = "b3f7c92d1a04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "purchases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("supplier_name", sa.String(length=120), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("total_dirhams", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_purchases_purchase_date", "purchases", ["purchase_date"])
    op.create_table(
        "purchase_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("purchase_id", sa.Integer(), sa.ForeignKey("purchases.id"), nullable=False),
        sa.Column("item_name", sa.String(length=120), nullable=False),
        sa.Column("quantity_milli", sa.Integer(), nullable=False),
        sa.Column("line_total_dirhams", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("purchase_items")
    op.drop_index("ix_purchases_purchase_date", table_name="purchases")
    op.drop_table("purchases")
