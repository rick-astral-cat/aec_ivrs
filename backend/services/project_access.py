"""Project-level access rules.

Global permissions (permissions.py) decide what a user can do across the app.
Inside a project, access also depends on the user's membership:

    action                          admin*  owner  member  assignee
    view the project                  x       x      x        x
    edit/delete project               x       x
    add/remove/change members         x       x
    create/edit/delete activities     x       x
    mark an activity completed        x       x               x (own)

    * via projects:view_all / projects:manage_all

These are pure functions: they never raise HTTP errors. Routers decide how to
respond (404 when the user cannot even see the project, 403 otherwise).
"""

from typing import Optional

import models
from permissions import Permission, has_permission
from roles import ProjectRole


def get_membership(project: models.Project, user: models.User) -> Optional[models.ProjectMember]:
    """Return the user's membership in the project, or None."""
    return next((m for m in project.members if m.user_id == user.id), None)


def get_project_role(project: models.Project, user: models.User) -> Optional[ProjectRole]:
    """Return the user's role inside the project, or None if not a member."""
    membership = get_membership(project, user)
    return ProjectRole(membership.role) if membership else None


def can_view(project: models.Project, user: models.User) -> bool:
    return has_permission(user, Permission.PROJECTS_VIEW_ALL) or get_membership(project, user) is not None


def can_manage(project: models.Project, user: models.User) -> bool:
    """Edit/delete the project and manage its members and activities."""
    return (
        has_permission(user, Permission.PROJECTS_MANAGE_ALL)
        or get_project_role(project, user) == ProjectRole.OWNER
    )


def can_complete(project: models.Project, activity: models.Activity, user: models.User) -> bool:
    """Mark an activity as completed or pending."""
    return can_manage(project, user) or (
        activity.assignee_id == user.id and get_membership(project, user) is not None
    )
