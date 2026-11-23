"""Alembic environment.

Wires migrations to the application's SQLAlchemy metadata and engine so the
API, the management CLI and Alembic always target the same database.

It is used both from the ``alembic`` command line and programmatically by
``bootstrap.run_migrations()`` at application startup. In the latter case the
caller sets ``config.attributes["configure_logger"] = False`` so Alembic does not
override the application's logging configuration.
"""

from logging.config import fileConfig

from alembic import context

import models  # noqa: F401  # Registers every table on Base.metadata.
from database import DATABASE_URL, Base, engine

config = context.config

if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit the migration SQL to stdout without connecting to the database."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Apply migrations using the application's engine."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite cannot ALTER most column/constraint changes in place; batch
            # mode recreates the table behind the scenes when needed.
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
