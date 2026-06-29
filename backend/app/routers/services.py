from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/", response_model=List[schemas.ServiceOut])
def list_services(actif_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(models.Service)
    if actif_only:
        query = query.filter(models.Service.actif == True)
    return query.order_by(models.Service.nom).all()


@router.post("/", response_model=schemas.ServiceOut)
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = models.Service(**service.model_dump())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.patch("/{service_id}", response_model=schemas.ServiceOut)
def update_service(service_id: UUID, update: schemas.ServiceUpdate, db: Session = Depends(get_db)):
    db_service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(db_service, field, value)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.delete("/{service_id}")
def delete_service(service_id: UUID, db: Session = Depends(get_db)):
    db_service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    db.delete(db_service)
    db.commit()
    return {"ok": True}
