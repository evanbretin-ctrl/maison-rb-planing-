import uuid
from sqlalchemy import Column, String, Integer, Boolean, Numeric, Time, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String, nullable=False)
    duree_min = Column(Integer, nullable=False)
    prix = Column(Numeric(6, 2), nullable=False)
    actif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Horaire(Base):
    __tablename__ = "horaires"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jour_semaine = Column(Integer, nullable=False)  # 0=lundi, 6=dimanche
    heure_debut = Column(Time, nullable=False)
    heure_fin = Column(Time, nullable=False)
    actif = Column(Boolean, default=True)


class Blocage(Base):
    __tablename__ = "blocages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    debut = Column(DateTime(timezone=True), nullable=False)
    fin = Column(DateTime(timezone=True), nullable=False)
    motif = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"))
    client_nom = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    client_tel = Column(String, nullable=False)
    debut = Column(DateTime(timezone=True), nullable=False)
    fin = Column(DateTime(timezone=True), nullable=False)
    statut = Column(String, default="confirmee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
