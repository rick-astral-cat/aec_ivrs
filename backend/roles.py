"""Global user roles.

Every user has exactly one global role stored in ``users.role``. The role
decides what the user can do across the whole application (agencies, projects,
user management). The mapping from roles to concrete permissions lives in
``permissions.py``.
"""

from enum import Enum


class Role(str, Enum):
    ADMIN = "admin"    # Full access, including user and role management.
    EDITOR = "editor"  # Can create and edit content, but not delete agencies.
    VIEWER = "viewer"  # Read-only access.


# Role assigned to newly created users unless another one is requested.
DEFAULT_ROLE = Role.VIEWER
