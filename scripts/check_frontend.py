"""Run inside the API container: docker compose exec -T api python < scripts/check_frontend.py."""

import json
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import uuid4

from sqlalchemy import delete

from app.infrastructure.config import Settings
from app.infrastructure.database import create_database
from app.infrastructure.models import UserModel

email = f"web-check-{uuid4().hex}@example.com"
jar = CookieJar()
opener = build_opener(HTTPCookieProcessor(jar))
engine, factory = create_database(Settings().database_url)


def call(path, body=None, origin="http://localhost:3000"):
    request = Request(
        f"http://web:3000{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", "Origin": origin},
    )
    try:
        with opener.open(request, timeout=20) as response:
            text = response.read().decode()
            data = (
                json.loads(text) if "application/json" in response.headers["Content-Type"] else text
            )
            return response.status, data, response.headers
    except HTTPError as error:
        return error.code, None, error.headers


try:
    assert call("/")[0] == 200
    assert call("/api/health")[0] == 200
    assert call("/api/users/profile")[0] == 401
    assert call("/api/users/login", {}, origin="https://other.example")[0] == 403
    assert call("/api/arbitrary")[0] == 404
    assert (
        call(
            "/api/users/register",
            {
                "email": email,
                "password": "test-password123",
                "first_name": "Web",
                "last_name": "Check",
            },
        )[0]
        == 201
    )
    status, login, headers = call(
        "/api/users/login", {"email": email, "password": "test-password123"}
    )
    assert status == 200 and login["email"] == email and "token" not in login
    cookie_headers = headers.get_all("Set-Cookie")
    assert len(cookie_headers) == 2
    assert all("HttpOnly" in h and "SameSite=lax" in h for h in cookie_headers)
    assert headers["Cache-Control"] == "no-store"
    assert call("/api/users/profile")[1]["email"] == email
    result = call("/api/data/users?_page=1&_pageSize=1")[1]
    assert result["total_data"] == 1 and result["data"][0]["email"] == email
    assert call("/api/data/user-tokens")[1]["total_data"] == 1
    assert "access" not in call("/api/data/user-tokens")[1]["data"][0]
    assert call("/api/data/user-permissions")[1]["total_data"] == 0
    assert call("/api/data/users/describe")[1]["type"] == "object"
    assert call(f"/api/data/users/{login['id']}")[1]["data"]["email"] == email
    assert call("/api/users/refresh-token", {})[1]["email"] == email
    # Simulate access-cookie expiry: refresh is held only by the server-facing cookie.
    for cookie in list(jar):
        if cookie.name == "cw_access":
            jar.clear(cookie.domain, cookie.path, cookie.name)
    assert call("/api/users/profile")[0] == 401
    assert call("/api/users/refresh-token", {})[0] == 200
    assert call("/api/users/profile")[0] == 200
    assert call("/api/users/logout", {})[0] == 200
    assert call("/api/users/profile")[0] == 401
    assert call("/api/users/refresh-token", {})[0] == 401
    print("PASS: Next.js → FastAPI → PostgreSQL; cookies, CSRF, auth, data, refresh and logout.")
finally:
    with factory() as session:
        session.execute(delete(UserModel).where(UserModel.email == email))
        session.commit()
    engine.dispose()
