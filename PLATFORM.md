# Platform — webservice comptes organisateurs

Service **séparé** d'Engine V2. V2 continue sur `tournament-manager-engine-v2` sans modification.

## URLs

| Service | Branche | Rôle |
|---------|---------|------|
| `tournament-manager-engine-v2` | `feature/engine-v2` | Hub + Engine V2 + Live V2 + PDF |
| `tournament-manager-platform` | `feature/platform` | Login, profil club, mes tournois |

## Fichiers ajoutés

```
Dockerfile.platform          # Build frontend platform + API légère
requirements-platform.txt    # FastAPI, SQLAlchemy, JWT, Postgres
api/main_platform.py         # Entrée uvicorn
api/platform/                # Auth, club, tournois
schema/platform.sql          # Schéma PostgreSQL
render.yaml                  # Service + base Render
```

## Variables d'environnement (Render)

| Variable | Exemple | Rôle |
|----------|---------|------|
| `DEPLOY_TARGET` | `platform` | Identifie le service |
| `DATABASE_URL` | (auto Render) | PostgreSQL |
| `JWT_SECRET` | (auto généré) | Tokens login |
| `ENGINE_V2_URL` | `https://tournament-manager-engine-v2.onrender.com` | Lien wizard / Live |
| `PLATFORM_SEED_TEST_USERS` | `true` | Phase test : crée les comptes fictifs au démarrage |

Pas de disque persistant requis : le **logo club** est stocké en PostgreSQL (`logo_data`).

## Comptes test (phase actuelle)

Domaine fictif `@padel-test.fr` — authentification réelle, **un espace par compte** :

| Email | Mot de passe | Club par défaut |
|-------|--------------|-----------------|
| `admin@padel-test.fr` | `admin` | CLUB ADMIN |
| `admin1@padel-test.fr` | `admin1` | CLUB TEST 1 |
| `admin2@padel-test.fr` | `admin2` | CLUB TEST 2 |
| `admin3@padel-test.fr` | `admin3` | CLUB TEST 3 |

Créés automatiquement au 1er démarrage si `PLATFORM_SEED_TEST_USERS=true`.  
Liste aussi via `GET /api/platform/auth/test-accounts` (écran de connexion).

Pour la prod réelle : mettre `PLATFORM_SEED_TEST_USERS=false` et supprimer la route test.

## API (MVP)

```
POST /api/platform/auth/register   { email, password }
POST /api/platform/auth/login      { email, password } → { access_token }
GET  /api/platform/me              Authorization: Bearer …
GET  /api/platform/club-profile
PUT  /api/platform/club-profile
POST /api/platform/club/logo       multipart file (≤ 2 Mo, stocké en BDD)
GET  /api/platform/club/logo/{user_id}
GET  /api/platform/tournaments
GET  /api/platform/engine-v2-url   → { url }
GET  /api/platform/health
```

## Déploiement Render (plan Free possible)

1. Branche `feature/platform` sur GitHub
2. Web Service : `Dockerfile.platform`, branche `feature/platform`
3. PostgreSQL : `tournament-platform-db` → lier `DATABASE_URL`
4. Health check : `/api/platform/health`
5. **Pas de disque** — logos en Postgres

Si la base existait déjà avec l’ancien schéma (`logo_path`) :

```bash
psql $DATABASE_URL -f schema/platform_migrate_logo_db.sql
```

## Local

```bash
# Terminal 1 — API (sqlite si pas de DATABASE_URL)
pip install -r requirements-platform.txt
export DEPLOY_TARGET=platform
uvicorn api.main_platform:app --reload --port 8001

# Terminal 2 — Frontend platform
cd frontend
VITE_DEPLOY_TARGET=platform npm run dev -- --port 5175
```

Preview UI locale (mock) : `http://127.0.0.1:5174/#/preview/mvp`  
Platform build : routes `/` = écrans compte (quand `VITE_DEPLOY_TARGET=platform`).

## Créer le 1er compte

```bash
curl -X POST http://localhost:8001/api/platform/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@club.fr","password":"admin"}'
```

## Prochaines étapes (brancher V2)

1. Front platform : login → API réelle (plus de mock)
2. « Nouveau tournoi » → redirect `{ENGINE_V2_URL}/#/engine-v2/participants?…` avec profil club
3. Post-génération V2 → webhook ou callback platform pour enregistrer le tournoi en BDD
4. Fiche tournoi → PDF / Live via liens V2 + snapshot stocké

Engine V2 **n'est pas modifié** : il reçoit des appels HTTP ou des redirects depuis Platform.
