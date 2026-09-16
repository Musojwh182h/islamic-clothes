"""replace phone authentication with email

Revision ID: 20260916_0002
Revises: 20260914_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260916_0002"
down_revision: str | None = "20260914_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))
    op.execute(
        "UPDATE users SET email = 'legacy-' || replace(id::text, '-', '') || '@invalid.local' "
        "WHERE email IS NULL"
    )
    op.alter_column("users", "email", existing_type=sa.String(length=320), nullable=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    # Phone values are retained temporarily for audit/migration, but new accounts no longer use them.
    op.alter_column("users", "phone", existing_type=sa.String(length=16), nullable=True)
    # Force re-authentication after changing the account identifier.
    op.execute("DELETE FROM refresh_sessions")


def downgrade() -> None:
    op.execute(
        "UPDATE users SET phone = '+0' || substr(md5(id::text), 1, 14) "
        "WHERE phone IS NULL"
    )
    op.alter_column("users", "phone", existing_type=sa.String(length=16), nullable=False)
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "email")
