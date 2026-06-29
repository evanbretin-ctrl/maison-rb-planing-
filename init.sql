-- Maison RB - Initialisation de la base de données

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS services (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  duree_min   int not null,
  prix        numeric(6,2) not null,
  actif       boolean default true,
  created_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS horaires (
  id            uuid primary key default gen_random_uuid(),
  jour_semaine  int not null,  -- 0=lundi, 6=dimanche
  heure_debut   time not null,
  heure_fin     time not null,
  actif         boolean default true
);

CREATE TABLE IF NOT EXISTS blocages (
  id          uuid primary key default gen_random_uuid(),
  debut       timestamptz not null,
  fin         timestamptz not null,
  motif       text,
  created_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid references services(id),
  client_nom      text not null,
  client_email    text not null,
  client_tel      text not null,
  debut           timestamptz not null,
  fin             timestamptz not null,
  statut          text default 'confirmee',
  created_at      timestamptz default now()
);

-- Données de départ : services
INSERT INTO services (nom, duree_min, prix) VALUES
  ('Coupe homme', 30, 25),
  ('Coupe + barbe', 45, 35),
  ('Barbe seule', 20, 15),
  ('Coupe enfant', 20, 18)
ON CONFLICT DO NOTHING;

-- Données de départ : horaires (lun-sam, 9h-19h)
INSERT INTO horaires (jour_semaine, heure_debut, heure_fin) VALUES
  (0, '09:00', '19:00'),  -- lundi
  (1, '09:00', '19:00'),  -- mardi
  (2, '09:00', '19:00'),  -- mercredi
  (3, '09:00', '19:00'),  -- jeudi
  (4, '09:00', '19:00'),  -- vendredi
  (5, '09:00', '17:00')   -- samedi
ON CONFLICT DO NOTHING;
