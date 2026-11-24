"""Project, member and activity data-access operations (Teams migration).

These functions assume the caller already checked access with
``services.project_access``. They raise ``ProjectError`` subclasses for
business-rule violations (e.g. assigning an activity to a non-member) and never
raise HTTP errors; routers translate them into responses.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

import models
import schemas
from permissions import Permission, has_permission
from roles import ProjectRole


class ProjectError(Exception):
    """Base class for project business-rule violations."""


class UserNotFoundError(ProjectError):
    pass


class DuplicateMemberError(ProjectError):
    pass


class LastOwnerError(ProjectError):
    pass


class AssigneeNotMemberError(ProjectError):
    pass


# Eager-load everything a project card/detail needs in a few queries.
_PROJECT_LOAD_OPTIONS = (
    selectinload(models.Project.members).selectinload(models.ProjectMember.user),
    selectinload(models.Project.activities).selectinload(models.Activity.assignee),
    selectinload(models.Project.activities).selectinload(models.Activity.completed_by),
    selectinload(models.Project.created_by),
)


def _touch(project: models.Project) -> None:
    """Bump updated_at when a child (member/activity) changes."""
    project.updated_at = datetime.now(timezone.utc)


# --- Projects ---------------------------------------------------------------

def list_projects_for(db: Session, user: models.User) -> list[models.Project]:
    """Projects visible to the user: all with projects:view_all, else memberships."""
    query = db.query(models.Project).options(*_PROJECT_LOAD_OPTIONS)
    if not has_permission(user, Permission.PROJECTS_VIEW_ALL):
        query = query.join(models.ProjectMember).filter(models.ProjectMember.user_id == user.id)
    return query.order_by(models.Project.updated_at.desc()).all()


def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return (
        db.query(models.Project)
        .options(*_PROJECT_LOAD_OPTIONS)
        .filter(models.Project.id == project_id)
        .first()
    )


def create_project(db: Session, payload: schemas.ProjectCreate, creator: models.User) -> models.Project:
    """Create a project; the creator becomes its first owner."""
    project = models.Project(name=payload.name, description=payload.description, created_by=creator)
    project.members.append(models.ProjectMember(user=creator, role=ProjectRole.OWNER.value))
    db.add(project)
    db.commit()
    return get_project(db, project.id)


def update_project(db: Session, project: models.Project, payload: schemas.ProjectUpdate) -> models.Project:
    data = payload.model_dump(exclude_unset=True)
    if data.get("name") is not None:
        project.name = data["name"]
    if "description" in data:
        project.description = data["description"]
    _touch(project)
    db.commit()
    return get_project(db, project.id)


def delete_project(db: Session, project: models.Project) -> None:
    """Delete the project with its memberships and activities (users are kept)."""
    db.delete(project)
    db.commit()


# --- Members ----------------------------------------------------------------

def _owner_count(project: models.Project) -> int:
    return sum(1 for m in project.members if m.role == ProjectRole.OWNER.value)


def get_member(project: models.Project, member_id: int) -> Optional[models.ProjectMember]:
    return next((m for m in project.members if m.id == member_id), None)


def add_member(db: Session, project: models.Project, payload: schemas.MemberCreate) -> models.ProjectMember:
    user = db.get(models.User, payload.user_id)
    if not user or not user.is_active:
        raise UserNotFoundError("User not found or inactive")
    if any(m.user_id == user.id for m in project.members):
        raise DuplicateMemberError("User is already a member of this project")
    member = models.ProjectMember(user=user, role=payload.role.value)
    project.members.append(member)
    _touch(project)
    db.commit()
    return member


def update_member_role(
    db: Session, project: models.Project, member: models.ProjectMember, role: ProjectRole
) -> models.ProjectMember:
    if member.role == ProjectRole.OWNER.value and role != ProjectRole.OWNER and _owner_count(project) <= 1:
        raise LastOwnerError("A project must keep at least one owner")
    member.role = role.value
    _touch(project)
    db.commit()
    return member


def remove_member(db: Session, project: models.Project, member: models.ProjectMember) -> None:
    """Remove a member and unassign their activities in this project."""
    if member.role == ProjectRole.OWNER.value and _owner_count(project) <= 1:
        raise LastOwnerError("A project must keep at least one owner")
    for activity in project.activities:
        if activity.assignee_id == member.user_id:
            activity.assignee = None
    project.members.remove(member)
    _touch(project)
    db.commit()


# --- Activities -------------------------------------------------------------

def get_activity(project: models.Project, activity_id: int) -> Optional[models.Activity]:
    return next((a for a in project.activities if a.id == activity_id), None)


def _resolve_assignee(project: models.Project, assignee_id: Optional[int]) -> Optional[models.User]:
    if assignee_id is None:
        return None
    member = next((m for m in project.members if m.user_id == assignee_id), None)
    if not member:
        raise AssigneeNotMemberError("The assignee must be a member of the project")
    return member.user


def create_activity(db: Session, project: models.Project, payload: schemas.ActivityCreate) -> models.Activity:
    """Append a new activity at the end of the project's list."""
    max_position = (
        db.query(func.max(models.Activity.position))
        .filter(models.Activity.project_id == project.id)
        .scalar()
    )
    activity = models.Activity(
        title=payload.title,
        assignee=_resolve_assignee(project, payload.assignee_id),
        tags=payload.tags,
        due_date=payload.due_date,
        position=(max_position + 1) if max_position is not None else 0,
    )
    project.activities.append(activity)
    _touch(project)
    db.commit()
    return activity


def update_activity(
    db: Session,
    project: models.Project,
    activity: models.Activity,
    payload: schemas.ActivityUpdate,
    actor: models.User,
) -> models.Activity:
    """Apply a partial update.

    Completing records who and when (so ``completed_at`` is always the last time
    it was marked done); reopening clears both, e.g. after a mistaken check.
    """
    data = payload.model_dump(exclude_unset=True)
    if data.get("title") is not None:
        activity.title = data["title"]
    if "assignee_id" in data:
        activity.assignee = _resolve_assignee(project, data["assignee_id"])
    if data.get("tags") is not None:
        activity.tags = data["tags"]
    if "due_date" in data:
        activity.due_date = data["due_date"]
    if data.get("position") is not None:
        activity.position = data["position"]
    if data.get("is_completed") is not None and data["is_completed"] != activity.is_completed:
        activity.is_completed = data["is_completed"]
        if activity.is_completed:
            activity.completed_at = datetime.now(timezone.utc)
            activity.completed_by = actor
        else:
            activity.completed_at = None
            activity.completed_by = None
    _touch(project)
    db.commit()
    return activity


def delete_activity(db: Session, project: models.Project, activity: models.Activity) -> None:
    project.activities.remove(activity)
    _touch(project)
    db.commit()
