from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/blocages", tags=["blocages"])


@router.get("/", response_model=List[schemas.BlocageOut])
def list_blocages(db: Session = Depends(get_db)):
    return db.query(models.Blocage).order_by(models.Blocage.debut).all()


@router.post("/", response_model=schemas.BlocageOut)
def create_blocage(blocage: schemas.BlocageCreate, db: Session = Depends(get_db)):
    db_blocage = models.Blocage(**blocage.model_dump())
    db.add(db_blocage)
    db.commit()
    db.refresh(db_blocage)
    return db_blocage


@router.delete("/{blocage_id}")
def delete_blocage(blocage_id: UUID, db: Session = Depends(get_db)):
    db_blocage = db.query(models.Blocage).filter(models.Blocage.id == blocage_id).first()
    if not db_blocage:
        raise HTTPException(status_code=404, detail="Blocage non trouvé")
    db.delete(db_blocage)
    db.commit()
    return {"ok": True}
