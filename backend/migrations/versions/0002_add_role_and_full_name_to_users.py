"""Add role and full_name to users.

Existing users become "editor" so nobody loses the access they had before roles
existed (everyone could create, edit and delete). The default administrator
account (DEFAULT_ADMIN_USER, "admin" by default) becomes "admin". New users
created afterwards default to "viewer".

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-23
"""

import os
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(), nullable=False, server_default="viewer")
        )
        batch_op.add_column(sa.Column("full_name", sa.String(), nullable=True))

    # Data migration: keep the current access level of pre-existing users.
    users = sa.table("users", sa.column("username", sa.String), sa.column("role", sa.String))
    op.execute(users.update().values(role="editor"))
    admin_username = os.getenv("DEFAULT_ADMIN_USER", "admin").strip()
    op.execute(users.update().where(users.c.username == admin_username).values(role="admin"))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("full_name")
        batch_op.drop_column("role")
