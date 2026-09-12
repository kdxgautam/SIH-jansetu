"""institutions can ask government to join the programme"""
from alembic import op
import sqlalchemy as sa

revision = "8c41b7d5e903"
down_revision = "6e0c0f4a1d2b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "partner_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("organization_name", sa.String(length=160), nullable=False),
        sa.Column("contact_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("district", sa.String(length=60), nullable=False),
        sa.Column("domains", sa.JSON(), nullable=False),
        sa.Column("capabilities", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=False),
        sa.Column("reviewer_id", sa.String(length=36), nullable=True),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("kind IN ('university','industry')"),
        sa.CheckConstraint("status IN ('pending','approved','declined')"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_partner_requests_email"), "partner_requests", ["email"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_partner_requests_email"), table_name="partner_requests")
    op.drop_table("partner_requests")
