"""Store checkout request fingerprint for safe retries."""
import sqlalchemy as sa
from alembic import op

revision = "20260915_0003"
down_revision = "20260914_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("orders", sa.Column("request_fingerprint", sa.String(64), nullable=True))


def downgrade():
    op.drop_column("orders", "request_fingerprint")
