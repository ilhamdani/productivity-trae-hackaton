from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_user_role"
down_revision = "0004_agent_prompts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(), nullable=False, server_default="user"))


def downgrade() -> None:
    op.drop_column("users", "role")

