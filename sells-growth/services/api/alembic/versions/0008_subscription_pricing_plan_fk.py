from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0008_sub_pricing_plan_fk"
down_revision = "0007_pricing_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_subscriptions",
        sa.Column("pricing_plan_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_user_subscriptions_pricing_plan_id",
        "user_subscriptions",
        "pricing_plans",
        ["pricing_plan_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    bind = op.get_bind()
    plan_keys = [
        r[0]
        for r in bind.execute(sa.text("SELECT DISTINCT plan_key FROM user_subscriptions WHERE plan_key IS NOT NULL")).fetchall()
    ]
    plan_keys = sorted(set(plan_keys + ["free"]))
    for key in plan_keys:
        exists = bind.execute(sa.text("SELECT 1 FROM pricing_plans WHERE key=:key LIMIT 1"), {"key": key}).fetchone()
        if exists:
            continue
        bind.execute(
            sa.text(
                """
                INSERT INTO pricing_plans (id, key, name, price_amount, currency, interval, is_active, created_at, updated_at)
                VALUES (:id, :key, :name, :price_amount, 'IDR', 'monthly', true, now(), now())
                """
            ),
            {"id": str(uuid.uuid4()), "key": key, "name": key.upper(), "price_amount": 0},
        )

    bind.execute(
        sa.text(
            """
            UPDATE user_subscriptions us
            SET pricing_plan_id = pp.id
            FROM pricing_plans pp
            WHERE pp.key = us.plan_key AND us.pricing_plan_id IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_constraint("fk_user_subscriptions_pricing_plan_id", "user_subscriptions", type_="foreignkey")
    op.drop_column("user_subscriptions", "pricing_plan_id")
