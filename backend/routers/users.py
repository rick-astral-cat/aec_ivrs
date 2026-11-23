"""User directory routes.

Exposes only public user data (id, username, full name) so any authenticated
user can pick project members and assignees. Role management stays in the CLI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import auth
import schemas
from database import get_db
from services import user_service

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    dependencies=[Depends(auth.get_current_user)],
)


@router.get("", response_model=list[schemas.UserSummary])
def list_users(db: Session = Depends(get_db)):
    """Return active users (directory for member and assignee pickers)."""
    return user_service.list_active_users(db)
