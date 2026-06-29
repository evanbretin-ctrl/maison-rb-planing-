from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, date
from uuid import UUID
import os
import resend

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/reservations", tags=["reservations"])

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def send_emails(reservation: models.Reservation, service: models.Service):
    resend.api_key = os.getenv("RESEND_API_KEY", "")
    coiffeur_email = os.getenv("COIFFEUR_EMAIL", "")
    frontend_url = os.getenv("FRONTEND_URL", "")

    debut_str = reservation.debut.strftime("%A %d %B %Y à %H:%M")

    resend.Emails.send({
        "from": "Maison RB <noreply@maisonrb.fr>",
        "to": coiffeur_email,
        "subject": f"Nouvelle réservation - {reservation.client_nom}",
        "html": f"""
        <h2>Nouvelle réservation</h2>
        <p><strong>Client :</strong> {reservation.client_nom}</p>
        <p><strong>Email :</strong> {reservation.client_email}</p>
        <p><strong>Téléphone :</strong> {reservation.client_tel}</p>
        <p><strong>Service :</strong> {service.nom} ({service.duree_min} min)</p>
        <p><strong>Date :</strong> {debut_str}</p>
        """,
    })

    resend.Emails.send({
        "from": "Maison RB <noreply@maisonrb.fr>",
        "to": reservation.client_email,
        "subject": "Confirmation de votre réservation - Maison RB",
        "html": f"""
        <h2>Votre réservation est confirmée !</h2>
        <p>Bonjour {reservation.client_nom},</p>
        <p>Votre rendez-vous pour <strong>{service.nom}</strong> est confirmé le <strong>{debut_str}</strong>.</p>
        <p>À bientôt chez Maison RB !</p>
        """,
    })


@router.get("/creneaux", response_model=List[schemas.Creneau])
def get_creneaux(service_id: UUID, date_str: str, db: Session = Depends(get_db)):
    """Retourne les créneaux disponibles pour un service et une date donnée."""
    try:
        jour = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (attendu: YYYY-MM-DD)")

    service = db.query(models.Service).filter(models.Service.id == service_id, models.Service.actif == True).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    # 0=lundi en Python, idem dans notre schéma
    jour_semaine = jour.weekday()

    horaire = db.query(models.Horaire).filter(
        models.Horaire.jour_semaine == jour_semaine,
        models.Horaire.actif == True
    ).first()

    if not horaire:
        return []

    debut_journee = datetime.combine(jour, horaire.heure_debut)
    fin_journee = datetime.combine(jour, horaire.heure_fin)
    duree = timedelta(minutes=service.duree_min)

    reservations_jour = db.query(models.Reservation).filter(
        models.Reservation.debut >= debut_journee,
        models.Reservation.debut < fin_journee,
        models.Reservation.statut != "annulee"
    ).all()

    blocages_jour = db.query(models.Blocage).filter(
        models.Blocage.fin > debut_journee,
        models.Blocage.debut < fin_journee
    ).all()

    creneaux = []
    slot_debut = debut_journee
    while slot_debut + duree <= fin_journee:
        slot_fin = slot_debut + duree
        conflit = False

        for r in reservations_jour:
            if slot_debut < r.fin and slot_fin > r.debut:
                conflit = True
                break

        if not conflit:
            for b in blocages_jour:
                if slot_debut < b.fin and slot_fin > b.debut:
                    conflit = True
                    break

        if not conflit:
            creneaux.append(schemas.Creneau(debut=slot_debut, fin=slot_fin))

        slot_debut += duree

    return creneaux


@router.post("/", response_model=schemas.ReservationOut)
def create_reservation(data: schemas.ReservationCreate, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == data.service_id, models.Service.actif == True).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    fin = data.debut + timedelta(minutes=service.duree_min)

    conflit_resa = db.query(models.Reservation).filter(
        models.Reservation.debut < fin,
        models.Reservation.fin > data.debut,
        models.Reservation.statut != "annulee"
    ).first()
    if conflit_resa:
        raise HTTPException(status_code=409, detail="Ce créneau n'est plus disponible")

    conflit_blocage = db.query(models.Blocage).filter(
        models.Blocage.debut < fin,
        models.Blocage.fin > data.debut
    ).first()
    if conflit_blocage:
        raise HTTPException(status_code=409, detail="Ce créneau n'est plus disponible")

    reservation = models.Reservation(
        service_id=data.service_id,
        client_nom=data.client_nom,
        client_email=data.client_email,
        client_tel=data.client_tel,
        debut=data.debut,
        fin=fin,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    try:
        send_emails(reservation, service)
    except Exception:
        pass  # Ne pas bloquer la réservation si l'email échoue

    return reservation


@router.get("/", response_model=List[schemas.ReservationOut])
def list_reservations(date_str: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Reservation)
    if date_str:
        try:
            jour = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Format de date invalide")
        debut_journee = datetime.combine(jour, datetime.min.time())
        fin_journee = datetime.combine(jour, datetime.max.time())
        query = query.filter(
            models.Reservation.debut >= debut_journee,
            models.Reservation.debut <= fin_journee
        )
    return query.order_by(models.Reservation.debut).all()


@router.patch("/{reservation_id}/annuler", response_model=schemas.ReservationOut)
def annuler_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    reservation.statut = "annulee"
    db.commit()
    db.refresh(reservation)
    return reservation
