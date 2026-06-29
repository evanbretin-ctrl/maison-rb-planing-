from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/horaires", tags=["horaires"])


@router.get("/", response_model=List[schemas.HoraireOut])
def list_horaires(db: Session = Depends(get_db)):
    return db.query(models.Horaire).order_by(models.Horaire.jour_semaine).all()


@router.post("/", response_model=schemas.HoraireOut)
def create_horaire(horaire: schemas.HoraireCreate, db: Session = Depends(get_db)):
    db_horaire = models.Horaire(**horaire.model_dump())
    db.add(db_horaire)
    db.commit()
    db.refresh(db_horaire)
    return db_horaire


@router.delete("/{horaire_id}")
def delete_horaire(horaire_id: UUID, db: Session = Depends(get_db)):
    db_horaire = db.query(models.Horaire).filter(models.Horaire.id == horaire_id).first()
    if not db_horaire:
        raise HTTPException(status_code=404, detail="Horaire non trouvé")
    db.delete(db_horaire)
    db.commit()
    return {"ok": True}
