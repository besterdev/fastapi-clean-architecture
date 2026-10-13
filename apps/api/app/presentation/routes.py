from math import ceil
from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.presentation.dependencies import CurrentUser, Data, Users
from app.presentation.schemas import (
    DATA_SCHEMAS,
    DataListResponse,
    DataResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/v1")


@router.get("/", tags=["monitor"])
def health(request: Request) -> dict:
    settings = request.app.state.settings
    return {"name": settings.app_name, "version": settings.app_version}


@router.post("/users/register", response_model=UserResponse, status_code=201, tags=["users"])
def register(body: RegisterRequest, service: Users):
    return service.register(str(body.email), body.password, body.first_name, body.last_name)


@router.post("/users/login", response_model=LoginResponse, tags=["users"])
def login(body: LoginRequest, service: Users):
    return service.login(str(body.email), body.password)


@router.post("/users/refresh-token", response_model=LoginResponse, tags=["users"])
def refresh(body: RefreshRequest, service: Users):
    return service.refresh(body.refresh_token)


@router.post("/users/logout", tags=["users"])
def logout(body: RefreshRequest, service: Users) -> None:
    service.logout(body.refresh_token)


@router.post("/users/profile", response_model=UserResponse, tags=["users"])
@router.get("/users/profile", response_model=UserResponse, tags=["users"])
def profile(user: CurrentUser):
    return user


@router.get("/data/{resource}/describe", tags=["data"])
def describe(resource: str, user: CurrentUser, service: Data) -> dict:
    service.check_resource(resource)
    return DATA_SCHEMAS[resource].model_json_schema()


@router.get("/data/{resource}/", response_model=DataListResponse, tags=["data"])
def list_data(
    resource: str,
    user: CurrentUser,
    service: Data,
    page: Annotated[int, Query(alias="_page", ge=1)] = 1,
    size: Annotated[int, Query(alias="_pageSize", ge=1, le=1000)] = 10,
):
    result = service.list(resource, user.id, page, size)
    return DataListResponse(
        data=result.data,
        page=page,
        page_size=size,
        total_data=result.total,
        total_page=ceil(result.total / size),
        data_schema=DATA_SCHEMAS[resource].model_json_schema(),
    )


@router.get("/data/{resource}/{record_id}", response_model=DataResponse, tags=["data"])
def get_data(resource: str, record_id: int, user: CurrentUser, service: Data):
    return DataResponse(
        data=service.get(resource, user.id, record_id),
        data_schema=DATA_SCHEMAS[resource].model_json_schema(),
    )
