"""link evidence attachments to milestones"""
from alembic import op
import sqlalchemy as sa

revision = "6e0c0f4a1d2b"
down_revision = "1b6ee2a9f851"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("attachments", sa.Column("milestone_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_attachments_milestone_id"), "attachments", ["milestone_id"], unique=False)
    op.create_foreign_key("fk_attachments_milestone_id", "attachments", "milestones", ["milestone_id"], ["id"])


def downgrade():
    op.drop_constraint("fk_attachments_milestone_id", "attachments", type_="foreignkey")
    op.drop_index(op.f("ix_attachments_milestone_id"), table_name="attachments")
    op.drop_column("attachments", "milestone_id")
