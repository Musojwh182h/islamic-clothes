"""remove duplicate catalog constraints

Revision ID: 20260914_0002
Revises: 20260914_0001
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260914_0002"
down_revision: str | None = "20260914_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("products_slug_key", "products", type_="unique")
    op.drop_constraint("product_variants_sku_key", "product_variants", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("products_slug_key", "products", ["slug"])
    op.create_unique_constraint("product_variants_sku_key", "product_variants", ["sku"])
