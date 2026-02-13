# TherapyCare - development tasks
# Run from project root: make <target>

.PHONY: dev dev-backend dev-frontend test test-backend test-frontend lint lint-fix seed seed-demo migrate makemigrations install install-hooks check

# Docker compose wrapper (used when local tools are missing)
COMPOSE ?= docker compose -f infra/docker-compose.yml

# --- Development ---

dev:
	@echo "Starting full stack via Docker..."
	docker compose -f infra/docker-compose.yml up --build

dev-backend:
	@echo "Starting backend (ensure Postgres is running)..."
	@if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry run python manage.py runserver; \
	else \
		echo "poetry not found; using Docker backend instead."; \
		$(COMPOSE) up -d --build backend; \
	fi

dev-frontend:
	@echo "Starting frontend..."
	@if command -v npm >/dev/null 2>&1; then \
		cd frontend && npm run dev; \
	else \
		echo "npm not found; using Docker frontend instead."; \
		$(COMPOSE) up -d --build frontend; \
	fi

# --- Testing ---

test: test-backend test-frontend

test-backend:
	@if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry run pytest; \
	else \
		echo "poetry not found; using Docker backend tests instead."; \
		$(COMPOSE) run --rm backend pytest; \
	fi

test-frontend:
	cd frontend && npm run test:run

test-e2e:
	cd frontend && npm run test:e2e

# --- Linting & Formatting ---

lint: lint-backend lint-frontend

lint-backend:
	@if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry run ruff check . && poetry run black --check .; \
	else \
		echo "poetry not found; using Docker backend lint instead."; \
		$(COMPOSE) run --rm backend ruff check . && $(COMPOSE) run --rm backend black --check .; \
	fi

lint-frontend:
	cd frontend && npm run lint && npm run format:check && npm run typecheck

lint-fix: lint-fix-backend lint-fix-frontend

lint-fix-backend:
	@if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry run ruff check . --fix && poetry run black .; \
	else \
		echo "poetry not found; using Docker backend lint-fix instead."; \
		$(COMPOSE) run --rm backend ruff check . --fix && $(COMPOSE) run --rm backend black .; \
	fi

lint-fix-frontend:
	cd frontend && npm run lint:fix && npm run format

# --- Database ---

# Run backend command: prefer poetry, then pip/venv, else Docker
run-backend = @if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry run python manage.py $(1); \
	elif [ -f backend/.venv/bin/python ]; then \
		cd backend && .venv/bin/python manage.py $(1); \
	elif [ -f backend/.venv/Scripts/python.exe ]; then \
		cd backend && .venv/Scripts/python.exe manage.py $(1); \
	else \
		echo "Poetry/venv not found; using Docker backend instead."; \
		VITE_MODE=dev $(COMPOSE) run --rm backend python manage.py $(1); \
	fi

makemigrations:
	$(call run-backend,makemigrations)

migrate:
	$(call run-backend,migrate)

seed: seed-demo

seed-demo:
	$(call run-backend,seed_demo)

seed-minimal:
	$(call run-backend,seed)

# --- Setup ---

install: install-backend install-frontend

install-backend:
	@if command -v poetry >/dev/null 2>&1; then \
		cd backend && poetry install; \
	else \
		echo "poetry not found; skipping local backend install. Use 'make dev' (Docker) or install Poetry."; \
	fi

install-frontend:
	cd frontend && npm install

install-hooks:
	pre-commit install

# --- Pre-commit (run all hooks) ---

check:
	pre-commit run --all-files
