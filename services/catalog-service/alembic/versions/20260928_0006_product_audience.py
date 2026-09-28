"""add product audience

Revision ID: 20260928_0006
Revises: 20260917_0005
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260928_0006"
down_revision: str | None = "20260917_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("audience", sa.String(length=16), server_default="men", nullable=False),
    )
    op.create_check_constraint(
        "ck_products_audience",
        "products",
        "audience IN ('men', 'women', 'unisex')",
    )
    op.create_index("ix_products_audience", "products", ["audience"])


def downgrade() -> None:
    op.drop_index("ix_products_audience", table_name="products")
    op.drop_constraint("ck_products_audience", "products", type_="check")
    op.drop_column("products", "audience")
