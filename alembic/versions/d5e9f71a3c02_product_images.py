"""Add optional product images.

Revision ID: d5e9f71a3c02
Revises: c4a8d63e2b91
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e9f71a3c02"
down_revision: Union[str, Sequence[str], None] = "c4a8d63e2b91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("image_data", sa.LargeBinary(), nullable=True))
    op.add_column("products", sa.Column("image_content_type", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "image_content_type")
    op.drop_column("products", "image_data")
