# FastAPI API

Simple Clean Architecture backend. See [root setup instructions](../../README.md).

Run from the repository root with `make dev-api`, `make test-api`, or `make migrate`.
The local `.env` and SQLite database live in this app directory; Docker uses PostgreSQL.

## Architecture

```text
app/
  domain/          Plain dataclasses, errors and repository/security Protocols
  application/     UserService and DataService; business workflows
  infrastructure/  SQLAlchemy models/repositories, bcrypt, JWT and settings
  presentation/    FastAPI routers/dependencies and Pydantic HTTP schemas
  main.py          Composition root: assemble concrete adapters and use cases
migrations/        Versioned Alembic schema migrations
tests/             HTTP flows, use cases, migration and dependency checks
```

**Import direction:** application → domain; infrastructure → domain; presentation → application/domain.
`main.py` wires the concrete implementations. Domain and application never import FastAPI,
Pydantic, SQLAlchemy or infrastructure. Routers validate HTTP input and call use cases; use cases
receive ports via constructors. One SQLAlchemy session is scoped to each request. The application
explicitly commits completed writes through its repository port; failed requests roll back and
close the session. This keeps transactions simple without introducing a separate UoW abstraction.

Go mapping: entities → dataclasses, interfaces → Protocols, usecases → services,
Fiber handlers → APIRouter, GORM → SQLAlchemy, AutoMigrate → Alembic.

To add a feature: define domain data/ports → add a use case → implement its SQL adapter → add an
HTTP schema/router → wire in `main.py` → test the workflow. Do not return ORM models from use cases.

## API

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/v1/` | Name/version (liveness, not DB readiness) |
| POST | `/api/v1/users/register` | Create a user; 201 |
| POST | `/api/v1/users/login` | Return `{user, token: {access, refresh}}` |
| POST | `/api/v1/users/refresh-token` | Rotate tokens, preserve refresh expiry |
| POST | `/api/v1/users/logout` | Revoke the session; 200 JSON null |
| GET / POST | `/api/v1/users/profile` | Current user's profile |
| GET | `/api/v1/data/{resource}/describe` | Public response JSON Schema |
| GET | `/api/v1/data/{resource}/` | Paginated records owned by current user |
| GET | `/api/v1/data/{resource}/{id}` | One owned record |

Profile/data routes require `Authorization: Bearer <access>`. Resources are `users`, `user-tokens`,
`user-permissions`. List parameters retain `_page` and `_pageSize` (defaults 1/10; size 1–1000).
Permissions are stored/readable metadata; this template does not implement an admin or RBAC system.
Registration does not require a permission row for authentication.

```sh
curl -X POST http://localhost:8000/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"mac@example.com","password":"password123","first_name":"Mac","last_name":"Dev"}'

curl -X POST http://localhost:8000/api/v1/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mac@example.com","password":"password123"}'
```

Copy `token.access` into Swagger's **Authorize** field. Refresh/logout accept
`{"refresh_token":"<token.refresh>"}`. Passwords must be 8+ characters, at most 72 UTF-8 bytes
(bcrypt limit); first/last name are required. Email matching is case-insensitive.

## Changes from the Go template

- Actual Go route registrations are authoritative; generated Swagger paths differ. Prefix and user
  POST routes are retained; GET profile is added. Responses retain the user/token field names.
- One active session per user remains. Logging in again invalidates previous tokens. Token `jti`
  makes immediate repeat logins distinct. Access/refresh types, issuer, audience and expiry are checked.
- Refresh tokens rotate with the original deadline; refresh lifetime uses its own setting. Conditional
  updates reject concurrent reuse of a refresh token. Logout revokes access and refresh immediately.
- Bcrypt remains compatible with Go-generated password hashes. Only SHA-256 token fingerprints are
  persisted; existing Go JWT sessions are not accepted by this application.
- Generic reads are limited to owned rows and never expose password hashes or token values. The Go
  template passed permissions but did not enforce them. Broad/admin access requires an explicit policy.
- `data_schema`/describe now use JSON Schema, replacing the unfinished Avro description. Counts now
  use the full filtered dataset, not the number of rows on the current page. Unknown resources/records
  return 404; invalid credentials/tokens 401; duplicate email 409; invalid input/pagination 422.
  Error bodies use `{trace_id, message}`; validation adds sanitized `errors` without echoing input.
- Create/update/delete generic use cases were stubs and had no registered HTTP routes in the source;
  they are intentionally not advertised here. MongoDB had no configured models and is not included.
- This initial migration targets a **fresh database**, not an in-place upgrade of a Go database.
  For existing data, plan an explicit import/migration: normalize/deduplicate email, validate field
  lengths, preserve bcrypt hashes, and discard old sessions. Do not point `0001` at existing Go tables.

## Verify

```sh
../../.venv/bin/python -m pytest -q
../../.venv/bin/ruff check .
../../.venv/bin/ruff format --check .
```

Tests migrate an isolated DB, then exercise real HTTP → use case → SQL adapter → response flows.
They check register/login/profile, duplicate emails, validation, token rotation/replay/type/expiry,
logout, session replacement, safe data reads, ownership, pagination and OpenAPI. Framework-free
unit tests cover application logic with fake ports; an import check protects layer boundaries.

## References and attribution

- [FastAPI routers](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
  and [dependency injection](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI JWT/password hashing](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Cosmic Python repository pattern](https://www.cosmicpython.com/book/chapter_02_repository)
- [SQLAlchemy session lifecycle](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [Alembic migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [FastAPI Clean Example architecture reference](https://github.com/ivan-borovets/fastapi-clean-example/tree/legacy-2025)

Converted/adapted from the supplied Go template; the upstream Apache 2.0 license is preserved in
`LICENSE`. Changes include the Python implementation, separated framework boundaries, explicit
migrations, safer session handling, restricted data reads and automated tests.
