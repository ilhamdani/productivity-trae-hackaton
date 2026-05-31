from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_content_calendar"
down_revision = "0002_user_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False, server_default="post"),
        sa.Column("caption", sa.Text(), nullable=False, server_default=""),
        sa.Column("hashtags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("cta_text", sa.Text(), nullable=True),
        sa.Column("media_urls", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "content_schedule",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("draft_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content_drafts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False, server_default="Asia/Jakarta"),
        sa.Column("status", sa.String(), nullable=False, server_default="scheduled"),
        sa.Column("reminder_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("draft_id", name="uq_content_schedule_draft"),
    )

    op.create_table(
        "content_publications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("draft_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content_drafts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_post_id", sa.String(), nullable=True),
        sa.Column("post_url", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("draft_id", name="uq_content_publications_draft"),
    )


def downgrade() -> None:
    op.drop_table("content_publications")
    op.drop_table("content_schedule")
    op.drop_table("content_drafts")

