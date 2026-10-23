"""Application bootstrap routines run at startup."""

import logging
import os

from sqlalchemy.orm import Session

from services import user_service

logger = logging.getLogger("aec_ivrs.bootstrap")


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
    user_service.create_user(db, username=default_user, password=default_pass)
    logger.info(
        "Initial administrator account created: '%s'. "
        "MFA will be configured via QR on first login.",
        default_user,
    )
