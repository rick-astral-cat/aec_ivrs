"""Application bootstrap routines run at startup."""

import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from database import engine
from roles import Role
from services import user_service

logger = logging.getLogger("aec_ivrs.bootstrap")

ALEMBIC_INI = Path(__file__).resolve().parent / "alembic.ini"

# Revision that matches the schema created by the old ``create_all()`` call.
BASELINE_REVISION = "0001"


def run_migrations() -> None:
    """Bring the database schema up to date by applying pending Alembic migrations.

    Databases created before Alembic was adopted already have the baseline
    tables but no ``alembic_version`` table. Those are stamped at the baseline
    revision first (without re-creating tables) so only newer migrations run.
    """
    config = Config(str(ALEMBIC_INI))
    # Keep the application's logging configuration instead of alembic.ini's.
    config.attributes["configure_logger"] = False

    tables = set(inspect(engine).get_table_names())
    if "alembic_version" not in tables and "users" in tables:
        logger.info(
            "Existing database without migration history detected; "
            "stamping baseline revision %s.",
            BASELINE_REVISION,
        )
        command.stamp(config, BASELINE_REVISION)

    command.upgrade(config, "head")


def ensure_default_admin(db: Session) -> None:
    """Seed the default administrator account if the database has no users yet.

    The credentials come from DEFAULT_ADMIN_USER / DEFAULT_ADMIN_PASSWORD and
    fall back to sensible defaults for first-run development. The admin will be
    asked to configure MFA via QR on first login.
    """
    if user_service.count_users(db) > 0:
        return

    default_user = os.getenv("DEFAULT_ADMIN_USER", "admin")
    default_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "Dalton2026!")
    user_service.create_user(db, username=default_user, password=default_pass, role=Role.ADMIN)
    logger.info(
        "Initial administrator account created: '%s'. "
        "MFA will be configured via QR on first login.",
        default_user,
    )
