from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.data import DataService
from app.application.users import UserService
from app.domain.entities import User
from app.domain.errors import InvalidToken

bearer = HTTPBearer(auto_error=False)


def get_session(request: Request) -> Iterator[Session]:
    with request.app.state.session_factory() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise


def get_user_service(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> UserService:
    return request.app.state.user_service_factory(session)


def get_data_service(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> DataService:
    return request.app.state.data_service_factory(session)


def get_current_user(
    service: Annotated[UserService, Depends(get_user_service)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if credentials is None:
        raise InvalidToken("Bearer token required")
    return service.authenticate(credentials.credentials)


Users = Annotated[UserService, Depends(get_user_service)]
Data = Annotated[DataService, Depends(get_data_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]
