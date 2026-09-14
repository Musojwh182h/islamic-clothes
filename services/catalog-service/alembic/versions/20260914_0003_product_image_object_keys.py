"""store object keys instead of image URLs

Revision ID: 20260914_0003
Revises: 20260914_0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260914_0003"
down_revision: str | None = "20260914_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "product_images",
        "url",
        new_column_name="object_key",
        existing_type=sa.String(length=500),
        type_=sa.String(length=512),
        existing_nullable=False,
    )
    op.execute(
        """
        UPDATE product_images
        SET object_key = regexp_replace(object_key, '^/images/products/', 'products/')
        WHERE object_key LIKE '/images/products/%'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE product_images
        SET object_key = '/images/products/' || regexp_replace(object_key, '^products/', '')
        WHERE object_key LIKE 'products/%'
        """
    )
    op.alter_column(
        "product_images",
        "object_key",
        new_column_name="url",
        existing_type=sa.String(length=512),
        type_=sa.String(length=500),
        existing_nullable=False,
    )
