# SNDP Agil – Station Complaints

Application web de gestion des réclamations pour le réseau de stations-service de la SNDP Agil. Le système orchestre un flux multi-acteurs avec traçabilité complète, assignation automatique par département, mesure des délais (hors périodes « on hold ») et boucle d’évaluation (feedback manager, notation directeur).

- Référentiel: `Youbou01/station_complaints` (ID: 1140751890)
- Langages principaux (GitHub): TypeScript 30.3%, CSS 23.9%, HTML 23.9%, Python 21.6%, Other 0.3

---

## Sommaire
- [Architecture & technologies](#architecture--technologies)
- [Fonctionnalités clés](#fonctionnalités-clés)
- [Rôles et matrice d’accès](#rôles-et-matrice-daccès)
- [Modèle de données](#modèle-de-données)
- [Flux et statuts des réclamations](#flux-et-statuts-des-réclamations)
- [API principale (extraits)](#api-principale-extraits)
- [Frontend (Angular) – Points techniques](#frontend-angular--points-techniques)
- [Backend (FastAPI) – Points techniques](#backend-fastapi--points-techniques)
- [Exigences fonctionnelles (WBS)](#exigences-fonctionnelles-wbs)
- [Exigences non fonctionnelles](#exigences-non-fonctionnelles)
- [Installation & démarrage](#installation--démarrage)
- [Migrations Alembic (PostgreSQL)](#migrations-alembic-postgresql)
- [Sécurité & bonnes pratiques (.env)](#sécurité--bonnes-pratiques-env)
- [Crédits et période de stage](#crédits-et-période-de-stage)

---

## Architecture & technologies

- Frontend:
  - Angular standalone (Signals, formulaires réactifs « signals »)
  - Zoneless change detection (`provideZonelessChangeDetection`)
  - Intercepteurs HTTP (JWT Bearer)
  - Guards par rôle
  - CSS personnalisée (palette SNDP Agil), composants par rôle
- Backend:
  - FastAPI (Python), SQLAlchemy ORM
  - PostgreSQL (via `psycopg`)
  - Alembic (migrations de schéma)
  - Authentification JWT (OAuth2 password flow)
  - CORS autorisant `http://localhost:4200`
- Outils & libs:
  - Python: fastapi, sqlalchemy, alembic, python-dotenv, passlib (hash), pydantic (schemas)
  - JS/TS: Angular, RxJS (usage ponctuel), Forms Signals
  - GitHub Actions (optionnel), GitHub PRs, revues de code

---

## Fonctionnalités clés

- Déclaration des réclamations par les managers (multi-stations supportées)
- Envoi des réclamations par l’assistant → auto-assignation au bon intervenant (via Département: type ↔ intervenant)
- Prise en charge par l’intervenant, mise « on hold » (pause du temps de résolution), résolution
- Feedback du manager sur les réclamations résolues
- Notation par le directeur (1–5), calcul du temps de résolution net (hors « on hold »)
- Portails et interfaces par rôle (listes, filtres, détails, actions)
- Administration: utilisateurs, stations, départements (unicité 1 intervenant ↔ 1 département)
- Traçabilité des statuts et horodatages (assigned_at, resolved_at, on_hold_at, cumul des pauses)

---

## Rôles et matrice d’accès

| Rôle          | Accès aux données                                    | Actions autorisées                                                                                         |
|---------------|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Administrateur| Global (utilisateurs, stations, départements, toutes réclamations) | CRUD utilisateurs, stations, départements; assigner managers/assistants; consulter toutes réclamations     |
| Manager       | Réclamations de ses station(s)                        | Créer réclamations (open); sélectionner la station si multi-assigné; ajouter feedback après résolution     |
| Assistant     | Réclamations des stations qui lui sont assignées      | Envoyer (« Send ») réclamations → auto-assignation (assigned); consultation; (mise à jour lecture des statuts) |
| Intervenant   | Réclamations qui lui sont assignées                   | Prendre en charge (in_progress); mettre « on hold » (note) / reprise; résoudre (resolved)                  |
| Directeur     | Global (lecture)                                      | Noter les réclamations résolues (1–5); visualiser temps de résolution net et feedback du manager           |

Règles notables:
- Un intervenant ne peut être chef que d’un seul département (validation backend).
- Le manager peut être assigné à plusieurs stations (sélection de la station à la création).
- L’assistant voit uniquement les réclamations des stations qui lui sont assignées.

---

## Modèle de données

Entités principales:
- User: `id`, `email`, `password_hash`, `role`, `is_active`, `created_at`
- Station: `id`, `name`, `code`, `address`, `governorate`, `manager_id`, `assistant_id`, `created_at`
- Department: `id`, `name`, `complaint_type` (technical, mechanical, oil_related, safety, administrative), `intervenant_id`, `created_at` (unicité intervenant ↔ département)
- Complaint:
  - Métadonnées: `id`, `title`, `description`, `type`, `severity`, `status`
  - Liens: `station_id`, `created_by_id`, `assigned_to_id`
  - Horodatages: `created_at`, `updated_at`, `assigned_at`, `resolved_at`, `on_hold_at`
  - Temps: `total_on_hold_seconds` (cumul des pauses)
  - Autres: `resolution_notes`, `manager_feedback`, `manager_feedback_at`
- Rating: `id`, `complaint_id`, `intervenant_id`, `director_id`, `rating_score`, `resolution_time_hours`, `created_at`

---

## Flux et statuts des réclamations

Statuts:
- `open` → créée par le manager
- `assigned` → envoyée par l’assistant (auto-assignée à l’intervenant du département; `assigned_at` horodaté)
- `in_progress` → prise en charge par l’intervenant
- `on_hold` → pause motivée, horodatée (`on_hold_at`), cumulée dans `total_on_hold_seconds` (soustraite du temps de résolution)
- `resolved` → clôturée par l’intervenant (`resolved_at`)

Calcul du temps de résolution net:
- `resolution_time_seconds = (resolved_at - assigned_at) - total_on_hold_seconds`
- `resolution_time_hours = resolution_time_seconds / 3600`
- Affiché côté direction; sert d’input pour l’évaluation.

Boucle d’amélioration:
- Feedback du manager (texte + date) sur les réclamations résolues
- Notation par le directeur (1–5)
- Affichage de la note côté intervenant (tableaux de bord)

---

## API principale (extraits)

- Authentification:
  - `POST /login` → JWT (OAuth2PasswordRequestForm: `username=email`, `password`)
  - `POST /setup/first-admin` → création du tout premier administrateur (one-shot sécurité)
- Utilisateurs:
  - `GET /users` (admin), `POST /users` (admin), etc.
- Stations:
  - `GET /stations`, `POST /stations` (admin)
  - Assignations: `PUT /stations/{id}/manager`, `PUT /stations/{id}/assistant` (admin)
- Départements:
  - `POST /departments`, `GET /departments`, `PUT /departments/{id}`, `DELETE /departments/{id}` (admin/assistant en lecture)
  - Validation: un intervenant ne peut être chef de plusieurs départements
- Réclamations:
  - `POST /complaints` (manager) → statut `open`, station choisie si multi-assignation
  - `GET /complaints` → filtrage par rôle (admin: global; assistant: stations assignées; intervenant: assignées à lui; manager: ses stations; directeur: global)
  - `GET /complaints/{id}` → détails (station, créateur, intervenant, timestamps, notes)
  - `PUT /complaints/{id}/status` (intervenant/assistant) → transitions; gestion du « on_hold »
  - `PUT /complaints/{id}/assign` (assistant) → auto-assignation à l’intervenant du département, horodatage `assigned_at` (si applicable)
  - `POST /complaints/{id}/feedback` (manager) → ajout du feedback post-résolution
- Intervenants:
  - `GET /intervenants` (assistant/admin) → liste des intervenants actifs
- Notes (ratings):
  - `POST /ratings` (directeur) → noter une réclamation résolue
  - `GET /ratings` (directeur/admin) → liste, filtrage par intervenant
  - `GET /my-ratings` (intervenant) → notes concernant ses réclamations

CORS:
- Autorise l’origine `http://localhost:4200` pour le frontend Angular.

---

## Frontend (Angular) – Points techniques

- Bootstrap: `bootstrapApplication(App, appConfig)`
- `app.config.ts`:
  - `provideZonelessChangeDetection()` (optimise la détection de changements)
  - `APP_INITIALIZER` pour initialiser l’auth avant routage (persistance au rechargement)
  - `provideHttpClient(withInterceptors([authInterceptor]))` (JWT dans `Authorization: Bearer`)
  - `provideRouter(routes)`
- Intercepteur `auth-interceptor.ts`:
  - Lis le token depuis `localStorage` et l’attache aux requêtes
- Auth:
  - Service avec Signals (`currentUser`, `isLoggedIn`, `isInitialized`)
  - `APP_INITIALIZER` appelle `AuthService.initialize()` pour récupérer l’utilisateur (`/me`) si token présent
- Guards:
  - `authGuard`, `roleGuard(allowedRoles)` pour protéger les routes
- Formulaires:
  - Forms Signals (validation de `title`, `description`, `type`, `severity`)
  - `(submit)="onSubmit($event)"` + `event.preventDefault()` pour éviter le rechargement natif de page
- UI par rôles:
  - Admin: create user (modal), stations (gouvernorat en dropdown, assignation manager dès la création), départements (unicité intervenant↔département), visibilité du texte corrigée
  - Assistant: Dashboard et listes des réclamations des stations assignées; bouton « Send » (auto-assignation)
  - Intervenant: « Handle » (in_progress), « On Hold » (note), « Résoudre »; affichage des notes reçues (★)
  - Directeur: Tableau global, temps de résolution net, bouton « Rate » caché après notation
- Accessibilité & contraste:
  - Corrections CSS pour visibilité des valeurs (éviter texte blanc sur fond blanc)

---

## Backend (FastAPI) – Points techniques

- Authentification JWT (security, `create_access_token`)
- Dépendances d’accès par rôles (`require_roles(...)`)
- Schemas Pydantic (ex.: `ComplaintCreate`, `ComplaintStatusUpdate`, `RatingCreate`, `UserResponse`)
- Gestion fine des statuts et temps:
  - `on_hold_at` horodaté, accumulation `total_on_hold_seconds`
  - `assigned_at`, `resolved_at`
- Validation métier:
  - Intervenant unique par département
  - Droits par rôle sur les endpoints
  - Filtrage `GET /complaints` selon le rôle courant
- Base de données:
  - PostgreSQL (via `DATABASE_URL` dans `.env`)
  - SQLAlchemy ORM
  - Alembic migrations (voir section dédiée)
- CORS & sécurité:
  - CORS configuré pour Angular dev
  - Stockage des secrets via `.env`
  - Rotation recommandée si fuite historique

---

## Exigences fonctionnelles (WBS)

1. Comptes & rôles
   1.1 Auth JWT, récupération de l’utilisateur courant
   1.2 Gestion utilisateurs (admin)
   1.3 Attribution des rôles et activations
2. Référentiels
   2.1 Stations (CRUD, gouvernorat)
   2.2 Assignations managers↔stations (multi), assistants↔stations
   2.3 Départements (type↔intervenant unique)
3. Réclamations
   3.1 Création par manager (open, multi-station)
   3.2 Envoi par assistant (assigned + `assigned_at`)
   3.3 Prise en charge (in_progress)
   3.4 Mise « on hold » (note + `on_hold_at`, cumul pause)
   3.5 Résolution (resolved + `resolved_at`, notes)
   3.6 Feedback manager
4. Évaluation & reporting
   4.1 Notation (directeur, 1–5), verrou du bouton après note
   4.2 Calcul temps net (exclusion des pauses)
   4.3 Dashboards par rôle, filtres
5. Sécurité & traçabilité
   5.1 Guards/roles côté frontend
   5.2 Validations backend, dépendances d’auth
   5.3 Historisation via horodatages

---

## Exigences non fonctionnelles

- UX/UI: sobriété, lisibilité, contrastes, parcours par rôle
- Performance: requêtes API légères, pagination possible
- Sécurité: JWT, séparation des rôles, `.env` non commité (voir bonnes pratiques)
- Maintenabilité: Alembic pour l’évolution du schéma; code modulaire (services)
- Évolutivité: séparation Front/Back; référentiels (stations, départements) administrables

---

## Installation & démarrage

Pré-requis:
- Python 3.11+
- PostgreSQL 14+ (ou compatible)
- Node.js 18+ / npm
- Angular CLI (optionnel, pour `ng serve`)

Backend:
```bash
# 1) Cloner le dépôt
git clone https://github.com/Youbou01/station_complaints.git
cd station_complaints

# 2) Créer et activer l'environnement
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3) Installer dépendances (exemple si requirements.txt est présent)
pip install -r requirements.txt
# Sinon:
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic python-dotenv passlib

# 4) Configurer .env (voir section sécurité)
# DATABASE_URL=postgresql+psycopg://USER:PASS@localhost:5432/station_complaints
# SECRET_KEY=...
# ALGORITHM=HS256

# 5) Alembic (voir section dédiée)
alembic upgrade head

# 6) Lancer le backend
uvicorn main:app --reload
# Backend: http://localhost:8000, docs: http://localhost:8000/docs
```

Frontend:
```bash
# 1) Aller dans le frontend
cd frontend

# 2) Installer les dépendances
npm install

# 3) Démarrer (selon configuration)
npm run start
# ou
ng serve -o
# Frontend: http://localhost:4200
```

Initialisation:
```bash
# Créer le tout premier administrateur (one-shot)
POST http://localhost:8000/setup/first-admin
# corps: { "email": "...", "password": "...", "role": "administrator" }
```

---

## Migrations Alembic (PostgreSQL)

Configuration (déjà intégrée):
- `alembic/env.py` utilise `Base.metadata` et lit `DATABASE_URL` depuis `.env`
- `main.py`: `Base.metadata.create_all(bind=engine)` est **commenté** (Alembic gère le schéma)

Usage courant:
```bash
# Générer une migration après modification des modèles
alembic revision --autogenerate -m "message"

# Appliquer les migrations
alembic upgrade head

# Revenir en arrière
alembic downgrade -1

# Consulter l'état
alembic current
alembic history
```

---

## Sécurité & bonnes pratiques (.env)

- Ne pas commiter `.env` (ajouter `.env` et `**/.env` dans `.gitignore`)
- Si `.env` a été commité par le passé:
  - Retirer de l’index: `git rm --cached .env` puis commit/push
  - **Rotations**: changer immédiatement `SECRET_KEY`, mots de passe DB, etc.
  - Purge historique optionnelle (ex.: `git filter-repo`) + force push (coordination nécessaire)
- Fournir un `.env.example` (sans secrets) pour documenter les variables requises.

---

## Crédits et période de stage

- SNDP Agil – Département DSI (Développement Système Informatique)
- Période de stage: 01/01/2026 → 31/01/2026
- Projet: conception et réalisation d’une application web de gestion des réclamations multi-acteurs, avec suivi des statuts et des délais, auto-assignation par département, feedback manager et notation directeur.

---

## Annexes (pistes)

- Diagrammes (cas d’utilisation, séquences, classes, déploiement)
- Extraits de code en annexe (intercepteurs, guards, calcul du temps net)
- Captures d’écrans par rôle (interfaces représentatives)

---