from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class User:
    id: int
    email: str
    first_name: str
    last_name: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class Account:
    user: User
    password_hash: str


@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str


@dataclass(frozen=True)
class LoginResult:
    user: User
    token: TokenPair


@dataclass(frozen=True)
class TokenClaims:
    user_id: int
    expires_at: int


@dataclass(frozen=True)
class DataPage:
    data: list[dict]
    total: int
