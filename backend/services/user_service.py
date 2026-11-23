"""User data-access operations shared by the API, the bootstrap routine and
the management CLI.
"""

from typing import Optional

from sqlalchemy.orm import Session

import auth
import models
from roles import DEFAULT_ROLE, Role


def get_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """Return a user by primary key, or None if not found."""
    return db.get(models.User, user_id)


def get_by_username(db: Session, username: str) -> Optional[models.User]:
    """Return a user by username (trimmed), or None if not found."""
    return db.query(models.User).filter(models.User.username == username.strip()).first()


def list_active_users(db: Session) -> list[models.User]:
    """Return active users ordered by display name (used by member pickers)."""
    users = db.query(models.User).filter(models.User.is_active.is_(True)).all()
    return sorted(users, key=lambda u: (u.full_name or u.username).lower())


def count_users(db: Session) -> int:
    """Return the total number of users."""
    return db.query(models.User).count()


def create_user(
    db: Session,
    username: str,
    password: str,
    role: Role = DEFAULT_ROLE,
    full_name: Optional[str] = None,
) -> models.User:
    """Create a new user with a hashed password and MFA pending enrollment."""
    user = models.User(
        username=username.strip(),
        hashed_password=auth.hash_password(password),
        is_mfa_enabled=False,
        is_active=True,
        role=Role(role).value,
        full_name=full_name.strip() if full_name else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_password(db: Session, user: models.User, new_password: str) -> None:
    """Replace a user's password with a freshly hashed value."""
    user.hashed_password = auth.hash_password(new_password)
    db.commit()


def reset_mfa(db: Session, user: models.User) -> None:
    """Clear a user's MFA so a new QR is issued on their next login."""
    user.is_mfa_enabled = False
    user.totp_secret = None
    db.commit()


def set_role(db: Session, user: models.User, role: Role) -> None:
    """Change a user's global role."""
    user.role = Role(role).value
    db.commit()


def set_full_name(db: Session, user: models.User, full_name: Optional[str]) -> None:
    """Set (or clear, with an empty value) a user's display name."""
    user.full_name = full_name.strip() if full_name and full_name.strip() else None
    db.commit()
