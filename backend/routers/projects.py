"""Teams migration project routes: projects, members and activities.

Access model (see services/project_access.py):
  * Projects the user cannot see respond 404, so their existence is not leaked.
  * Visible projects the user cannot manage respond 403 on changes.
  * Assignees may only toggle ``is_completed`` on their own activities.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import get_db
from permissions import Permission, require_permission
from services import project_access, project_service
from services.project_service import (
    AssigneeNotMemberError,
    DuplicateMemberError,
    LastOwnerError,
    ProjectError,
    UserNotFoundError,
)

router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
    dependencies=[Depends(auth.get_current_user)],
)

# HTTP status for each business-rule violation raised by the service.
_ERROR_STATUS: dict[type[ProjectError], int] = {
    UserNotFoundError: status.HTTP_400_BAD_REQUEST,
    AssigneeNotMemberError: status.HTTP_400_BAD_REQUEST,
    DuplicateMemberError: status.HTTP_409_CONFLICT,
    LastOwnerError: status.HTTP_409_CONFLICT,
}


def _http_error(error: ProjectError) -> HTTPException:
    return HTTPException(status_code=_ERROR_STATUS.get(type(error), 400), detail=str(error))


# --- Helpers ----------------------------------------------------------------

def _get_visible_project(db: Session, project_id: int, user: models.User) -> models.Project:
    """Return the project or 404 if it does not exist or the user cannot see it."""
    project = project_service.get_project(db, project_id)
    if not project or not project_access.can_view(project, user):
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_managed_project(db: Session, project_id: int, user: models.User) -> models.Project:
    """Return the project or raise 404/403 if the user cannot manage it."""
    project = _get_visible_project(db, project_id, user)
    if not project_access.can_manage(project, user):
        raise HTTPException(status_code=403, detail="Only project owners can do this")
    return project


def _summary_fields(project: models.Project, user: models.User) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "activity_count": len(project.activities),
        "completed_count": sum(1 for a in project.activities if a.is_completed),
        "members": project.members,
        "my_role": project_access.get_project_role(project, user),
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


def _summary(project: models.Project, user: models.User) -> schemas.ProjectSummaryOut:
    return schemas.ProjectSummaryOut.model_validate(_summary_fields(project, user))


def _detail(project: models.Project, user: models.User) -> schemas.ProjectDetailOut:
    return schemas.ProjectDetailOut.model_validate({
        **_summary_fields(project, user),
        "created_by": project.created_by,
        "activities": project.activities,
        "can_manage": project_access.can_manage(project, user),
    })


# --- Projects ---------------------------------------------------------------

@router.get("", response_model=list[schemas.ProjectSummaryOut])
def list_projects(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Projects visible to the current user, most recently updated first."""
    return [_summary(p, user) for p in project_service.list_projects_for(db, user)]


@router.post("", response_model=schemas.ProjectDetailOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_permission(Permission.PROJECTS_CREATE)),
):
    """Create a project; the current user becomes its owner."""
    return _detail(project_service.create_project(db, payload, user), user)


@router.get("/{project_id}", response_model=schemas.ProjectDetailOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    return _detail(_get_visible_project(db, project_id, user), user)


@router.patch("/{project_id}", response_model=schemas.ProjectDetailOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    project = _get_managed_project(db, project_id, user)
    return _detail(project_service.update_project(db, project, payload), user)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Delete the project with its memberships and activities (users are kept)."""
    project_service.delete_project(db, _get_managed_project(db, project_id, user))


# --- Members ----------------------------------------------------------------

@router.post("/{project_id}/members", response_model=schemas.MemberOut, status_code=201)
def add_member(
    project_id: int,
    payload: schemas.MemberCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    project = _get_managed_project(db, project_id, user)
    try:
        return project_service.add_member(db, project, payload)
    except ProjectError as error:
        raise _http_error(error)


@router.patch("/{project_id}/members/{member_id}", response_model=schemas.MemberOut)
def update_member(
    project_id: int,
    member_id: int,
    payload: schemas.MemberUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    project = _get_managed_project(db, project_id, user)
    member = project_service.get_member(project, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    try:
        return project_service.update_member_role(db, project, member, payload.role)
    except ProjectError as error:
        raise _http_error(error)


@router.delete("/{project_id}/members/{member_id}", status_code=204)
def remove_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Remove a member; their activities in this project become unassigned."""
    project = _get_managed_project(db, project_id, user)
    member = project_service.get_member(project, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    try:
        project_service.remove_member(db, project, member)
    except ProjectError as error:
        raise _http_error(error)


# --- Activities -------------------------------------------------------------

@router.post("/{project_id}/activities", response_model=schemas.ActivityOut, status_code=201)
def create_activity(
    project_id: int,
    payload: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    project = _get_managed_project(db, project_id, user)
    try:
        return project_service.create_activity(db, project, payload)
    except ProjectError as error:
        raise _http_error(error)


@router.patch("/{project_id}/activities/{activity_id}", response_model=schemas.ActivityOut)
def update_activity(
    project_id: int,
    activity_id: int,
    payload: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Owners can change anything; the assignee can only toggle is_completed."""
    project = _get_visible_project(db, project_id, user)
    activity = project_service.get_activity(project, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    if not project_access.can_manage(project, user):
        only_completion = payload.model_fields_set <= {"is_completed"}
        if not (only_completion and project_access.can_complete(project, activity, user)):
            raise HTTPException(
                status_code=403,
                detail="Only owners can edit activities; assignees can only mark them completed",
            )
    try:
        return project_service.update_activity(db, project, activity, payload, user)
    except ProjectError as error:
        raise _http_error(error)


@router.delete("/{project_id}/activities/{activity_id}", status_code=204)
def delete_activity(
    project_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    project = _get_managed_project(db, project_id, user)
    activity = project_service.get_activity(project, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    project_service.delete_activity(db, project, activity)
