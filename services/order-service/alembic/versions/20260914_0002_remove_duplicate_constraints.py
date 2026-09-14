"""remove duplicate order constraints

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
    op.drop_constraint("carts_user_id_key", "carts", type_="unique")
    op.drop_constraint("orders_number_key", "orders", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("carts_user_id_key", "carts", ["user_id"])
    op.create_unique_constraint("orders_number_key", "orders", ["number"])
