from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AEC IVRS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/agencies", response_model=list[schemas.AgencyOut])
def list_agencies(db: Session = Depends(get_db)):
    return db.query(models.Agency).all()


@app.post("/agencies", response_model=schemas.AgencyOut, status_code=201)
def create_agency(payload: schemas.AgencyCreate, db: Session = Depends(get_db)):
    agency = models.Agency(**payload.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency


@app.get("/agencies/{agency_id}", response_model=schemas.AgencyOut)
def get_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@app.put("/agencies/{agency_id}", response_model=schemas.AgencyOut)
def update_agency(agency_id: int, payload: schemas.AgencyUpdate, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    for key, value in payload.model_dump().items():
        setattr(agency, key, value)
    db.commit()
    db.refresh(agency)
    return agency


@app.delete("/agencies/{agency_id}", status_code=204)
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    db.delete(agency)
    db.commit()
