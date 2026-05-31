from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_pricing_plans"
down_revision = "0006_user_subscriptions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pricing_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("price_amount", sa.Numeric(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="IDR"),
        sa.Column("interval", sa.String(), nullable=False, server_default="monthly"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("key", name="uq_pricing_plans_key"),
    )


def downgrade() -> None:
    op.drop_table("pricing_plans")

