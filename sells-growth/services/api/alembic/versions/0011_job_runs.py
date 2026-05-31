from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0011_job_runs"
down_revision = "0010_teams"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("job_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("upgraded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downgraded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_job_runs_job_key_started_at", "job_runs", ["job_key", "started_at"])


def downgrade() -> None:
    op.drop_index("ix_job_runs_job_key_started_at", table_name="job_runs")
    op.drop_table("job_runs")
