"""Agency CRUD routes.

Every route requires authentication (router-level dependency) plus the
permission matching its action (see permissions.ROLE_PERMISSIONS).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import schemas
from database import get_db
from permissions import Permission, require_permission
from services import agency_service

# Baseline: every endpoint requires a valid access token, even if a future route
# forgets its permission. Each route then adds the specific permission it needs.
router = APIRouter(
    prefix="/api/agencies",
    tags=["agencies"],
    dependencies=[Depends(auth.get_current_user)],
)


@router.get(
    "", response_model=list[schemas.AgencyOut],
    dependencies=[Depends(require_permission(Permission.AGENCIES_READ))],
)
def list_agencies(db: Session = Depends(get_db)):
    """Return all agencies."""
    return agency_service.list_agencies(db)


@router.post(
    "", response_model=schemas.AgencyOut, status_code=201,
    dependencies=[Depends(require_permission(Permission.AGENCIES_CREATE))],
)
def create_agency(payload: schemas.AgencyCreate, db: Session = Depends(get_db)):
    """Create a new agency."""
    return agency_service.create_agency(db, payload)


@router.get(
    "/{agency_id}", response_model=schemas.AgencyOut,
    dependencies=[Depends(require_permission(Permission.AGENCIES_READ))],
)
def get_agency(agency_id: int, db: Session = Depends(get_db)):
    """Return a single agency by id."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@router.put(
    "/{agency_id}", response_model=schemas.AgencyOut,
    dependencies=[Depends(require_permission(Permission.AGENCIES_UPDATE))],
)
def update_agency(agency_id: int, payload: schemas.AgencyUpdate, db: Session = Depends(get_db)):
    """Fully replace an existing agency (PUT semantics; all fields required)."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency_service.update_agency(db, agency, payload)


@router.delete(
    "/{agency_id}", status_code=204,
    dependencies=[Depends(require_permission(Permission.AGENCIES_DELETE))],
)
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    """Delete an agency by id."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agency_service.delete_agency(db, agency)
