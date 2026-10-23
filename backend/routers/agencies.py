"""Agency CRUD routes (all protected by authentication)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import schemas
from database import get_db
from services import agency_service

# Every endpoint in this router requires a valid access token.
router = APIRouter(
    prefix="/api/agencies",
    tags=["agencies"],
    dependencies=[Depends(auth.get_current_user)],
)


@router.get("", response_model=list[schemas.AgencyOut])
def list_agencies(db: Session = Depends(get_db)):
    """Return all agencies."""
    return agency_service.list_agencies(db)


@router.post("", response_model=schemas.AgencyOut, status_code=201)
def create_agency(payload: schemas.AgencyCreate, db: Session = Depends(get_db)):
    """Create a new agency."""
    return agency_service.create_agency(db, payload)


@router.get("/{agency_id}", response_model=schemas.AgencyOut)
def get_agency(agency_id: int, db: Session = Depends(get_db)):
    """Return a single agency by id."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@router.put("/{agency_id}", response_model=schemas.AgencyOut)
def update_agency(agency_id: int, payload: schemas.AgencyUpdate, db: Session = Depends(get_db)):
    """Fully replace an existing agency (PUT semantics; all fields required)."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency_service.update_agency(db, agency, payload)


@router.delete("/{agency_id}", status_code=204)
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    """Delete an agency by id."""
    agency = agency_service.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agency_service.delete_agency(db, agency)
