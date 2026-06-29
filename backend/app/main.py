from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database import engine, Base
from app.routers import services, reservations, blocages, horaires
from app import schemas

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Maison RB API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(reservations.router)
app.include_router(blocages.router)
app.include_router(horaires.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Maison RB API"}


@app.post("/auth/login")
def login(data: schemas.AdminLogin):
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if data.password != admin_password:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"authenticated": True}
