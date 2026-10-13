import jwt
import pytest
from sqlalchemy import select

from app.infrastructure.models import UserModel, UserPermissionModel, UserTokenModel
from app.infrastructure.security import JWTTokenProvider
from tests.conftest import auth


def test_register_login_profile_and_health(client, registered, logged_in):
    body, user = registered
    assert "password" not in user
    assert logged_in["user"] == user
    for method in (client.get, client.post):
        response = method("/api/v1/users/profile", headers=auth(logged_in["token"]["access"]))
        assert response.status_code == 200
        assert response.json()["email"] == body["email"]
    assert client.get("/api/v1/").json()["name"] == "FastAPI Clean Architecture"


def test_duplicate_email_and_invalid_credentials(client, registered):
    body, _ = registered
    duplicate = client.post("/api/v1/users/register", json={**body, "email": "MAC@example.com"})
    assert duplicate.status_code == 409
    assert duplicate.json()["trace_id"] == "users-001"
    for email in (body["email"], "missing@example.com"):
        response = client.post("/api/v1/users/login", json={"email": email, "password": "wrong"})
        assert response.status_code == 401
        assert response.json()["message"] == "Invalid email or password"


def test_refresh_rotates_and_logout_revokes(client, logged_in):
    previous = logged_in["token"]
    response = client.post(
        "/api/v1/users/refresh-token", json={"refresh_token": previous["refresh"]}
    )
    assert response.status_code == 200
    current = response.json()["token"]
    assert current != previous
    assert (
        jwt.decode(current["refresh"], options={"verify_signature": False})["exp"]
        == jwt.decode(previous["refresh"], options={"verify_signature": False})["exp"]
    )
    assert (
        client.post(
            "/api/v1/users/refresh-token",
            json={
                "refresh_token": previous["refresh"],
            },
        ).status_code
        == 401
    )
    assert client.get("/api/v1/users/profile", headers=auth(previous["access"])).status_code == 401
    assert (
        client.post("/api/v1/users/logout", json={"refresh_token": current["refresh"]}).json()
        is None
    )
    assert client.get("/api/v1/users/profile", headers=auth(current["access"])).status_code == 401
    assert (
        client.post(
            "/api/v1/users/refresh-token",
            json={
                "refresh_token": current["refresh"],
            },
        ).status_code
        == 401
    )


def test_second_login_replaces_session(client, logged_in, registered):
    body, _ = registered
    response = client.post(
        "/api/v1/users/login",
        json={
            "email": body["email"],
            "password": body["password"],
        },
    )
    assert response.status_code == 200
    assert response.json()["token"] != logged_in["token"]
    assert (
        client.get("/api/v1/users/profile", headers=auth(logged_in["token"]["access"])).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/users/logout",
            json={
                "refresh_token": logged_in["token"]["refresh"],
            },
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/v1/users/profile", headers=auth(response.json()["token"]["access"])
        ).status_code
        == 200
    )


def test_token_types_signatures_expiry_and_missing_auth(client, app, logged_in):
    token = logged_in["token"]
    assert client.get("/api/v1/users/profile").status_code == 401
    for access in (token["refresh"], "broken", token["access"] + "broken"):
        assert client.get("/api/v1/users/profile", headers=auth(access)).status_code == 401
    assert (
        client.post(
            "/api/v1/users/refresh-token", json={"refresh_token": token["access"]}
        ).status_code
        == 401
    )
    expired = JWTTokenProvider(app.state.settings).issue(logged_in["user"]["id"], 1).refresh
    assert (
        client.post("/api/v1/users/refresh-token", json={"refresh_token": expired}).status_code
        == 401
    )


def test_hashes_are_persisted_and_never_returned(client, app, logged_in):
    with app.state.session_factory() as session:
        user = session.scalar(select(UserModel))
        assert user.password.startswith("$2b$")
        assert user.password != "password123"
        tokens = session.scalar(select(UserTokenModel))
        assert len(tokens.access) == 64
        assert tokens.access != logged_in["token"]["access"]
    headers = auth(logged_in["token"]["access"])
    for resource in ("users", "user-tokens", "user-permissions"):
        response = client.get(f"/api/v1/data/{resource}/", headers=headers)
        assert response.status_code == 200
        assert "password" not in response.text
        assert "access" not in response.text
        assert "refresh" not in response.text


def test_data_ownership_pagination_and_detail(client, app, logged_in):
    user_id = logged_in["user"]["id"]
    response = client.post(
        "/api/v1/users/register",
        json={
            "email": "other@example.com",
            "password": "password123",
            "first_name": "Other",
            "last_name": "User",
        },
    )
    other_id = response.json()["id"]
    with app.state.session_factory() as session:
        session.add_all(
            [
                UserPermissionModel(user_id=user_id, permission="read"),
                UserPermissionModel(user_id=user_id, permission="write"),
                UserPermissionModel(user_id=other_id, permission="private"),
            ]
        )
        session.commit()
    headers = auth(logged_in["token"]["access"])
    result = client.get(
        "/api/v1/data/user-permissions/?_page=1&_pageSize=1", headers=headers
    ).json()
    assert result["total_data"] == 2
    assert result["total_page"] == 2
    assert len(result["data"]) == 1
    last = client.get("/api/v1/data/user-permissions/?_page=3&_pageSize=1", headers=headers).json()
    assert last["data"] == []
    assert last["total_data"] == 2
    assert client.get(f"/api/v1/data/users/{other_id}", headers=headers).status_code == 404
    assert (
        client.get(f"/api/v1/data/users/{user_id}", headers=headers).json()["data"]["id"] == user_id
    )
    schema = client.get("/api/v1/data/users/describe", headers=headers).json()
    assert schema["type"] == "object"
    assert "password" not in schema["properties"]
    assert client.get("/api/v1/data/unknown/", headers=headers).status_code == 404
    assert client.get("/api/v1/data/users/?_page=0", headers=headers).status_code == 422
    assert client.get("/api/v1/data/users/?_pageSize=1001", headers=headers).status_code == 422
    assert client.get("/api/v1/data/users/describe").status_code == 401


@pytest.mark.parametrize(
    "changes",
    [
        {"email": "not-an-email"},
        {"password": "short"},
        {"password": "ก" * 30},
        {"first_name": ""},
    ],
)
def test_validation_does_not_echo_passwords(client, changes):
    body = {
        "email": "mac@example.com",
        "password": "password123",
        "first_name": "Mac",
        "last_name": "Dev",
        **changes,
    }
    response = client.post("/api/v1/users/register", json=body)
    assert response.status_code == 422
    assert body["password"] not in response.text


def test_openapi_and_not_found(client):
    schema = client.get("/openapi.json").json()
    assert "/api/v1/users/register" in schema["paths"]
    assert schema["paths"]["/api/v1/users/profile"]["get"]["security"]
    assert client.get("/swagger").status_code == 200
    assert client.get("/missing").status_code == 404
