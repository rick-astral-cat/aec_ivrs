"""Centralized application configuration.

Loads environment variables from a local ``.env`` file (if present) and exposes
validated settings for the rest of the backend. Keeping this logic in one place
makes it easy to reason about security-sensitive defaults such as the JWT secret.
"""

import logging
import os

from dotenv import load_dotenv

# Load variables from a local .env file if it exists. In production the real
# values are expected to come from the process environment (e.g. systemd, Docker,
# or the AWS task definition), so a missing .env file is perfectly fine.
load_dotenv()

logger = logging.getLogger("aec_ivrs.config")

# Development-only fallback secret. It is intentionally obvious so it can never be
# mistaken for a real production secret. It is ONLY used when APP_ENV != production.
_DEV_JWT_SECRET = "KhYGLPQR_2NARb35CnWFOhoyQdUSNRZkCXs9akp_tHyDj48SQFkrLbIbTIJhsy9vFsU898bxobPboK9raprzpQ"

# Application environment: "development" (default) or "production".
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"


def _resolve_jwt_secret() -> str:
    """Return the JWT signing secret, enforcing its presence in production.

    In production a missing JWT_SECRET is a fatal misconfiguration: without a
    strong, private secret anyone could forge valid access tokens. We therefore
    refuse to start instead of silently falling back to a known key. In
    development we allow a clearly-labeled insecure fallback for convenience.
    """
    secret = os.getenv("JWT_SECRET", "").strip()

    if IS_PRODUCTION:
        if not secret:
            raise RuntimeError(
                "JWT_SECRET environment variable is required when APP_ENV=production. "
                "Refusing to start without a secure signing key."
            )
        return secret

    if not secret:
        logger.warning(
            "JWT_SECRET is not set; using an insecure development fallback. "
            "Set JWT_SECRET and APP_ENV=production before deploying."
        )
        return _DEV_JWT_SECRET

    return secret


# Resolved, validated settings consumed by the rest of the application.
JWT_SECRET = _resolve_jwt_secret()
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24h default
MFA_TOKEN_EXPIRE_MINUTES = 10
