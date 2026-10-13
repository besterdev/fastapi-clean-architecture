.PHONY: help install dev-api dev-web test test-api test-web lint typecheck build up down migrate check-integration logs

help:
	@echo "install            Install Python and web dependencies"
	@echo "dev-api / dev-web  Run each app locally"
	@echo "test / lint       Verify both apps"
	@echo "typecheck / build Verify and build Next.js"
	@echo "up / down         Start or stop the Docker stack"
	@echo "migrate           Apply database migrations in Docker"
	@echo "check-integration Test web -> API -> PostgreSQL"
	@echo "logs              Follow container logs"

install:
	python3 -m venv .venv
	.venv/bin/python -m pip install -e './apps/api[dev]'
	npm ci --prefix apps/web

dev-api:
	cd apps/api && ../../.venv/bin/uvicorn app.main:create_app --factory --reload

dev-web:
	npm run dev --prefix apps/web

test: test-api test-web

test-api:
	.venv/bin/python -m pytest -q apps/api/tests

test-web:
	npm run test --prefix apps/web

lint:
	.venv/bin/ruff check --config apps/api/pyproject.toml apps/api scripts
	npm run lint --prefix apps/web

typecheck:
	npm run typecheck --prefix apps/web

build:
	npm run build --prefix apps/web

up:
	docker compose up -d db
	docker compose build api web
	docker compose run --rm api alembic upgrade head
	docker compose up -d api web

down:
	docker compose down

migrate:
	docker compose run --rm api alembic upgrade head

check-integration:
	docker compose exec -T api python < scripts/check_frontend.py

logs:
	docker compose logs -f api web
