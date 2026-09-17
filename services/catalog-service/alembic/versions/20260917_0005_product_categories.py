"""add managed product categories

Revision ID: 20260917_0005
Revises: 20260914_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260917_0005"
down_revision: str | None = "20260914_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_product_categories_name"),
    )
    op.create_index("ix_product_categories_is_active", "product_categories", ["is_active"])
    op.create_index(
        "uq_product_categories_name_lower",
        "product_categories",
        [sa.text("lower(name)")],
        unique=True,
    )
    op.execute(
        "UPDATE products AS product SET category = categories.canonical "
        "FROM (SELECT lower(category) AS key, min(category) AS canonical FROM products GROUP BY lower(category)) AS categories "
        "WHERE lower(product.category) = categories.key"
    )
    op.execute(
        "INSERT INTO product_categories (id, name, is_active) "
        "SELECT gen_random_uuid(), category, true FROM products GROUP BY category"
    )
    op.create_foreign_key(
        "fk_products_category_product_categories",
        "products",
        "product_categories",
        ["category"],
        ["name"],
        onupdate="CASCADE",
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_products_category_product_categories", "products", type_="foreignkey")
    op.drop_index("uq_product_categories_name_lower", table_name="product_categories")
    op.drop_index("ix_product_categories_is_active", table_name="product_categories")
    op.drop_table("product_categories")
