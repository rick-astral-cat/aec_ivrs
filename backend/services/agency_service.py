"""Agency data-access operations.

These functions encapsulate all database access for agencies so the route
handlers stay thin and the same logic can be reused (e.g. by future CLI tools
or background jobs). They do not raise HTTP errors; callers decide how to react
to a ``None`` result.
"""

from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import models
import schemas

# Columns returned by the list endpoint. The IVR tree is deliberately left out:
# it is by far the largest column and the list only needs to know whether an
# agency has one.
_SUMMARY_COLUMNS = (
    models.Agency.id,
    models.Agency.name,
    models.Agency.abbreviation,
    models.Agency.region,
    models.Agency.phone_ranges,
    models.Agency.has_schedule,
    models.Agency.business_hours,
    models.Agency.after_hours_mailbox,
)

# True when the stored IVR is a non-empty list of nodes. SQL NULL, JSON null
# (how SQLAlchemy stores Python None) and an empty list all count as "no IVR".
# Computed by SQLite so the JSON text never reaches Python.
_HAS_IVR = (func.coalesce(func.json_array_length(models.Agency.ivr), 0) > 0).label("has_ivr")


def list_agency_summaries(db: Session) -> list[dict[str, Any]]:
    """Return every agency without its IVR tree, ordered by name."""
    stmt = select(*_SUMMARY_COLUMNS, _HAS_IVR).order_by(
        func.lower(models.Agency.name), models.Agency.id
    )
    return [dict(row) for row in db.execute(stmt).mappings()]


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
