from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.infrastructure.config import Settings
from app.main import create_app


@pytest.fixture
def app(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
    return create_app(
        Settings(
            _env_file=None,
            database_url=url,
            secret_key="test-only-secret-" * 3,
        )
    )


@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client


@pytest.fixture
def registered(client):
    body = {
        "email": "mac@example.com",
        "password": "password123",
        "first_name": "Mac",
        "last_name": "Developer",
    }
    response = client.post("/api/v1/users/register", json=body)
    assert response.status_code == 201
    return body, response.json()


@pytest.fixture
def logged_in(client, registered):
    body, user = registered
    response = client.post(
        "/api/v1/users/login",
        json={
            "email": body["email"],
            "password": body["password"],
        },
    )
    assert response.status_code == 200
    return response.json()


def auth(access):
    return {"Authorization": f"Bearer {access}"}
