"""Agency data-access operations.

These functions encapsulate all database access for agencies so the route
handlers stay thin and the same logic can be reused (e.g. by future CLI tools
or background jobs). They do not raise HTTP errors; callers decide how to react
to a ``None`` result.
"""

from typing import Optional

from sqlalchemy.orm import Session

import models
import schemas


def list_agencies(db: Session) -> list[models.Agency]:
    """Return all agencies."""
    return db.query(models.Agency).all()


def get_agency(db: Session, agency_id: int) -> Optional[models.Agency]:
    """Return a single agency by id, or None if it does not exist."""
    return db.get(models.Agency, agency_id)


def create_agency(db: Session, payload: schemas.AgencyCreate) -> models.Agency:
    """Create and persist a new agency from the given payload."""
    agency = models.Agency(**payload.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency


def update_agency(
    db: Session, agency: models.Agency, payload: schemas.AgencyUpdate
) -> models.Agency:
    """Fully replace an existing agency's fields (PUT semantics) and persist it."""
    for key, value in payload.model_dump().items():
        setattr(agency, key, value)
    db.commit()
    db.refresh(agency)
    return agency


def delete_agency(db: Session, agency: models.Agency) -> None:
    """Delete an existing agency."""
    db.delete(agency)
    db.commit()
