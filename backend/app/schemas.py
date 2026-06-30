from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, time
from uuid import UUID


# Services
class ServiceBase(BaseModel):
    nom: str
    duree_min: int
    prix: float
    actif: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    nom: Optional[str] = None
    duree_min: Optional[int] = None
    prix: Optional[float] = None
    actif: Optional[bool] = None


class ServiceOut(ServiceBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# Horaires
class HoraireBase(BaseModel):
    jour_semaine: int
    heure_debut: time
    heure_fin: time
    actif: bool = True


class HoraireCreate(HoraireBase):
    pass


class HoraireOut(HoraireBase):
    id: UUID

    model_config = {"from_attributes": True}


# Blocages
class BlocageBase(BaseModel):
    debut: datetime
    fin: datetime
    motif: Optional[str] = None


class BlocageCreate(BlocageBase):
    pass


class BlocageOut(BlocageBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# Réservations
class ReservationCreate(BaseModel):
    service_id: UUID
    client_nom: str
    client_email: EmailStr
    client_tel: str
    debut: datetime


class ReservationOut(BaseModel):
    id: UUID
    service_id: UUID
    client_nom: str
    client_email: str
    client_tel: str
    debut: datetime
    fin: datetime
    statut: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Créneaux disponibles
class Creneau(BaseModel):
    debut: datetime
    fin: datetime
    disponible: bool = True


# Auth admin
class AdminLogin(BaseModel):
    password: str
