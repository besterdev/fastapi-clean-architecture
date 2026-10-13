from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/fastapi_clean"


class Settings(DatabaseSettings):
    app_name: str = "FastAPI Clean Architecture"
    app_version: str = "0.1.0"
    secret_key: SecretStr
    jwt_issuer: str = "fastapi-clean-architecture"
    access_token_seconds: int = Field(default=900, gt=0)
    refresh_token_seconds: int = Field(default=604800, gt=0)
    cors_origins: list[str] = []

    @field_validator("secret_key")
    @classmethod
    def strong_secret(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value()
        if len(raw) < 32 or raw == "replace-with-a-random-secret-at-least-32-characters":
            raise ValueError("SECRET_KEY must be a generated secret of at least 32 characters")
        return value
