"""Role-based access control.

Maps each global role (see ``roles.Role``) to the set of permissions it grants
and provides a FastAPI dependency to protect routes:

    @router.delete("/{agency_id}")
    def delete_agency(..., user = Depends(require_permission(Permission.AGENCIES_DELETE))):
        ...

The mapping lives in code (not in the database) so it is versioned, reviewed
and easy to test. Project-level access (owner/member of a specific project) is
checked separately by the project service.
"""

from enum import Enum

from fastapi import Depends, HTTPException, status

import auth
import models
from roles import Role


class Permission(str, Enum):
    # Agencies
    AGENCIES_READ = "agencies:read"
    AGENCIES_CREATE = "agencies:create"
    AGENCIES_UPDATE = "agencies:update"
    AGENCIES_DELETE = "agencies:delete"

    # Projects (Teams migration)
    PROJECTS_CREATE = "projects:create"
    PROJECTS_VIEW_ALL = "projects:view_all"      # See projects the user is not a member of
    PROJECTS_MANAGE_ALL = "projects:manage_all"  # Act as owner on every project

    # Users
    USERS_MANAGE = "users:manage"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.ADMIN: frozenset(Permission),
    Role.EDITOR: frozenset({
        Permission.AGENCIES_READ,
        Permission.AGENCIES_CREATE,
        Permission.AGENCIES_UPDATE,
        Permission.PROJECTS_CREATE,
    }),
    Role.VIEWER: frozenset({
        Permission.AGENCIES_READ,
    }),
}


def permissions_for(role: str) -> frozenset[Permission]:
    """Return the permissions granted to a role; unknown roles get none."""
    try:
        return ROLE_PERMISSIONS[Role(role)]
    except ValueError:
        return frozenset()


def has_permission(user: models.User, permission: Permission) -> bool:
    """Return True if the user's global role grants the given permission."""
    return permission in permissions_for(user.role)


def require_permission(permission: Permission):
    """Build a FastAPI dependency that returns the current user or raises 403."""

    def dependency(user: models.User = Depends(auth.get_current_user)) -> models.User:
        if not has_permission(user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission.value}",
            )
        return user

    return dependency
