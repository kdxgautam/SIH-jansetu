"""outcome_ai_suggestions"""
from alembic import op
import sqlalchemy as sa

revision = "1b6ee2a9f851"
down_revision = "242dd3687295"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("outcomes", sa.Column("ai_status", sa.String(length=20), nullable=False, server_default="pending"))
    op.add_column("outcomes", sa.Column("ai_suggestions", sa.JSON(), nullable=True))
    op.alter_column("outcomes", "ai_status", server_default=None)


def downgrade():
    op.drop_column("outcomes", "ai_suggestions")
    op.drop_column("outcomes", "ai_status")
