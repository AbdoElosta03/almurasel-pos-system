"""rename fils columns to dirhams (LYD)

Revision ID: a1b2c3d4e5f6
Revises: 6d25663a18d6
Create Date: 2026-10-19

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6d25663a18d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('products') as batch_op:
        batch_op.alter_column('price_fils', new_column_name='price_dirhams')
    with op.batch_alter_table('shifts') as batch_op:
        batch_op.alter_column('opening_cash_fils', new_column_name='opening_cash_dirhams')
        batch_op.alter_column('closing_cash_fils', new_column_name='closing_cash_dirhams')
    with op.batch_alter_table('sales') as batch_op:
        batch_op.alter_column('total_fils', new_column_name='total_dirhams')
    with op.batch_alter_table('sale_items') as batch_op:
        batch_op.alter_column('unit_price_fils', new_column_name='unit_price_dirhams')
        batch_op.alter_column('line_total_fils', new_column_name='line_total_dirhams')


def downgrade() -> None:
    with op.batch_alter_table('sale_items') as batch_op:
        batch_op.alter_column('line_total_dirhams', new_column_name='line_total_fils')
        batch_op.alter_column('unit_price_dirhams', new_column_name='unit_price_fils')
    with op.batch_alter_table('sales') as batch_op:
        batch_op.alter_column('total_dirhams', new_column_name='total_fils')
    with op.batch_alter_table('shifts') as batch_op:
        batch_op.alter_column('closing_cash_dirhams', new_column_name='closing_cash_fils')
        batch_op.alter_column('opening_cash_dirhams', new_column_name='opening_cash_fils')
    with op.batch_alter_table('products') as batch_op:
        batch_op.alter_column('price_dirhams', new_column_name='price_fils')
