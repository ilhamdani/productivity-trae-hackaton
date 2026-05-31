from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_pricing_plan_limits"
down_revision = "0008_sub_pricing_plan_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pricing_plans", sa.Column("campaign_monthly_limit", sa.Integer(), nullable=True))
    op.add_column("pricing_plans", sa.Column("user_seats_limit", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("pricing_plans", "user_seats_limit")
    op.drop_column("pricing_plans", "campaign_monthly_limit")
