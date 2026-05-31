from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op

revision = "0012_free_plan_default_limit_10"
down_revision = "0011_job_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    row = bind.execute(sa.text("SELECT id FROM pricing_plans WHERE key='free' LIMIT 1")).fetchone()
    if not row:
        bind.execute(
            sa.text(
                """
                INSERT INTO pricing_plans (id, key, name, price_amount, currency, interval, is_active, campaign_monthly_limit, created_at, updated_at)
                VALUES (:id, 'free', 'FREE', 0, 'IDR', 'monthly', true, 10, now(), now())
                """
            ),
            {"id": str(uuid.uuid4())},
        )
    else:
        bind.execute(
            sa.text(
                """
                UPDATE pricing_plans
                SET campaign_monthly_limit = 10
                WHERE key='free' AND campaign_monthly_limit IS NULL
                """
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE pricing_plans SET campaign_monthly_limit = NULL WHERE key='free'"))
