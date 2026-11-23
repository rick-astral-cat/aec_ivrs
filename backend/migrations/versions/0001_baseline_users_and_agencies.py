"""Baseline: users and agencies tables.

Mirrors the schema that ``Base.metadata.create_all()`` produced before Alembic
was adopted. Fresh databases get these tables from this migration; existing
databases (created by ``create_all``) are stamped at this revision instead of
running it (see ``bootstrap.run_migrations``).

Revision ID: 0001
Revises:
Create Date: 2026-11-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("totp_secret", sa.String(), nullable=True),
        sa.Column("is_mfa_enabled", sa.Boolean(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "agencies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("abbreviation", sa.String(), nullable=False),
        sa.Column("region", sa.String(), nullable=False),
        sa.Column("phone_ranges", sa.String(), nullable=False),
        sa.Column("has_schedule", sa.Boolean(), nullable=True),
        sa.Column("business_hours", sa.String(), nullable=True),
        sa.Column("after_hours_mailbox", sa.String(), nullable=True),
        sa.Column("ivr", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("abbreviation"),
    )
    op.create_index("ix_agencies_id", "agencies", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_agencies_id", table_name="agencies")
    op.drop_table("agencies")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
