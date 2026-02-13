# TherapyCare Local Development

## Docker Compose (recommended)

Run the full stack with PostgreSQL, backend, frontend, and nginx:

```bash
# From project root
docker compose -f infra/docker-compose.yml up --build
```

- **App**: http://localhost:8080 (nginx proxy)
- **Frontend direct**: http://localhost:5173 (Vite dev with HMR)
- **Backend direct**: http://localhost:8000

### Environment variables

Create `infra/.env` or `.env` in project root (optional) to override defaults:

```env
POSTGRES_DB=therapycare
POSTGRES_USER=therapycare
POSTGRES_PASSWORD=therapycare
SECRET_KEY=dev-secret-key-change-in-production

# Backend: runserver (default) or gunicorn
RUN_MODE=runserver

# Frontend: dev (default) or build
VITE_MODE=dev
```

### Seed demo data

After the backend is up:

```bash
docker compose -f infra/docker-compose.yml exec backend python manage.py seed_demo
```

### Routing (nginx)

- `/` → frontend (Vite dev or preview)
- `/api/` → backend (Django)
- `/admin/` → backend (Django admin)

CORS and CSRF are configured for development. When using nginx (port 8080), the frontend and API are same-origin, so CORS is not required. For direct access (frontend on 5173, backend on 8000), CORS allows both origins.

---

## Local without Docker

### Prerequisites

- Python 3.12+, Node 20+, PostgreSQL 16

### Backend

```bash
cd backend

# Create virtualenv and install
poetry install

# Copy env
cp .env.example .env
# Edit .env: set POSTGRES_HOST=localhost, etc.

# Create DB and migrate
createdb therapycare  # or: psql -c "CREATE DATABASE therapycare"
poetry run python manage.py migrate

# Run server
poetry run python manage.py runserver

# Seed demo (optional)
poetry run python manage.py seed_demo
```

Backend: http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (proxies `/api` and `/admin` to backend)

### CORS / CSRF

When running locally without Docker:

- **CORS**: `config.settings.dev` sets `CORS_ALLOW_ALL_ORIGINS = True`
- **CSRF**: API uses JWT; `CSRF_TRUSTED_ORIGINS` includes localhost:5173 and 8080

.env.example files:

- `backend/.env.example` – Django, PostgreSQL, CORS
- `frontend/.env.example` – Vite mode, API URL (optional)
