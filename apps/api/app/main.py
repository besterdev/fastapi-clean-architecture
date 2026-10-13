from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.application.data import DataService
from app.application.users import UserService
from app.domain.errors import (
    ApplicationError,
    EmailAlreadyExists,
    InvalidCredentials,
    InvalidToken,
    NotFound,
)
from app.infrastructure.config import Settings
from app.infrastructure.database import create_database
from app.infrastructure.repositories import SQLDataRepository, SQLUserRepository
from app.infrastructure.security import BcryptPasswordHasher, JWTTokenProvider
from app.presentation.routes import router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Composition root: the only place assembling concrete adapters and use cases."""
    settings = settings or Settings()
    engine, session_factory = create_database(settings.database_url)
    passwords = BcryptPasswordHasher()
    tokens = JWTTokenProvider(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/swagger",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.user_service_factory = lambda session: UserService(
        SQLUserRepository(session), passwords, tokens
    )
    app.state.data_service_factory = lambda session: DataService(SQLDataRepository(session))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(router)

    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError):
        codes = {EmailAlreadyExists: 409, InvalidCredentials: 401, InvalidToken: 401, NotFound: 404}
        traces = {
            "register": "users-001",
            "login": "users-002",
            "refresh-token": "users-003",
            "logout": "users-004",
        }
        trace = traces.get(request.url.path.rsplit("/", 1)[-1], "error")
        status = codes.get(type(exc), 400)
        return JSONResponse(
            status_code=status,
            content={"trace_id": trace, "message": str(exc)},
            headers={"WWW-Authenticate": "Bearer"} if status == 401 else None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Do not echo input bodies (which can include passwords/tokens).
        return JSONResponse(
            status_code=422,
            content={
                "trace_id": "validation",
                "message": "Invalid request",
                "errors": [
                    {"loc": error["loc"], "message": error["msg"]} for error in exc.errors()
                ],
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "trace_id": "http",
                "message": str(exc.detail),
            },
        )

    return app
