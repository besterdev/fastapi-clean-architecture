from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def validate_password_bytes(value: str) -> str:
    if len(value.encode()) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return value


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    _bcrypt_length = field_validator("password")(validate_password_bytes)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    _bcrypt_length = field_validator("password")(validate_password_bytes)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    first_name: str
    last_name: str
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    access: str
    refresh: str


class LoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserResponse
    token: TokenResponse


class SessionResponse(BaseModel):
    id: int
    user_id: int
    updated_at: datetime


class PermissionResponse(SessionResponse):
    permission: str


class DataResponse(BaseModel):
    code: int = 0
    data: dict
    message: str = ""
    data_schema: dict


class DataListResponse(BaseModel):
    code: int = 0
    data: list[dict]
    page: int
    page_size: int
    total_page: int
    total_data: int
    message: str = ""
    data_schema: dict


DATA_SCHEMAS = {
    "users": UserResponse,
    "user-tokens": SessionResponse,
    "user-permissions": PermissionResponse,
}
