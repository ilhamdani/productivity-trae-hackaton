from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("key_hash", name="uq_api_keys_key_hash"),
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sku", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("base_description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("base_price_amount", sa.Numeric(), nullable=False),
        sa.Column("price_currency", sa.String(), nullable=False, server_default="IDR"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "sku", name="uq_products_user_sku"),
    )

    op.create_table(
        "inventory",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_code", sa.String(), nullable=False),
        sa.Column("qty_on_hand", sa.Integer(), nullable=False),
        sa.Column("qty_reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("product_id", "location_code", name="uq_inventory_product_location"),
    )

    op.create_table(
        "campaign_product_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("snapshot_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("campaign_id", name="uq_campaign_product_snapshots_campaign"),
    )

    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_snapshot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaign_product_snapshots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_name", sa.String(), nullable=False),
        sa.Column("product_description", sa.Text(), nullable=False),
        sa.Column("price_amount", sa.Numeric(), nullable=False),
        sa.Column("price_currency", sa.String(), nullable=False, server_default="IDR"),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("brand_tone", sa.Text(), nullable=True),
        sa.Column("target_location", sa.String(), nullable=True),
        sa.Column("primary_goal", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("approval_status", sa.String(), nullable=False, server_default="none"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_foreign_key(
        "fk_campaign_product_snapshots_campaign",
        "campaign_product_snapshots",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_campaign_product_snapshots_product",
        "campaign_product_snapshots",
        "products",
        ["product_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "campaign_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="queued"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.BigInteger(), nullable=True),
        sa.Column("output_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_code", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retryable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.UniqueConstraint("campaign_id", "step_key", name="uq_campaign_steps_campaign_step"),
    )

    op.create_table(
        "campaign_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_type", sa.String(), nullable=False),
        sa.Column("storage_provider", sa.String(), nullable=False, server_default="minio"),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("public_url", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("campaign_assets")
    op.drop_table("campaign_steps")
    op.drop_constraint("fk_campaign_product_snapshots_product", "campaign_product_snapshots", type_="foreignkey")
    op.drop_constraint("fk_campaign_product_snapshots_campaign", "campaign_product_snapshots", type_="foreignkey")
    op.drop_table("campaigns")
    op.drop_table("campaign_product_snapshots")
    op.drop_table("inventory")
    op.drop_table("products")
    op.drop_table("api_keys")
    op.drop_table("users")

