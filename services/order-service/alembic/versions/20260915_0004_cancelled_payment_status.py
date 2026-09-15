"""Keep unpaid payment state consistent with cancelled orders."""

from alembic import op

revision = "20260915_0004"
down_revision = "20260915_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE orders
        SET payment_status = 'cancelled'
        WHERE status = 'cancelled'
          AND payment_status IN ('pending', 'waiting')
        """
    )


def downgrade():
    pass
