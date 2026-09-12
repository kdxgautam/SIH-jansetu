"""index public search and challenge listings"""
from alembic import op

revision = "cce790fc92bb"
down_revision = "8c41b7d5e903"
branch_labels = None
depends_on = None

TRIGRAM = (
    ("ix_challenges_title_en_trgm", "public_title_en"),
    ("ix_challenges_title_hi_trgm", "public_title_hi"),
    ("ix_challenges_summary_en_trgm", "summary_en"),
    ("ix_challenges_summary_hi_trgm", "summary_hi"),
)


def upgrade():
    # Public search matches a substring anywhere in either language, which a
    # B-tree cannot serve; pg_trgm indexes those ILIKE patterns instead.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    for name, column in TRIGRAM:
        op.create_index(name, "challenges", [column], postgresql_using="gin", postgresql_ops={column: "gin_trgm_ops"})
    op.create_index("ix_challenges_published_created", "challenges", ["published", "created_at"])
    op.create_index("ix_challenges_created_at", "challenges", ["created_at"])


def downgrade():
    op.drop_index("ix_challenges_created_at", table_name="challenges")
    op.drop_index("ix_challenges_published_created", table_name="challenges")
    for name, column in reversed(TRIGRAM):
        op.drop_index(name, table_name="challenges", postgresql_using="gin", postgresql_ops={column: "gin_trgm_ops"})
    # The extension is left in place: other objects may depend on it.
