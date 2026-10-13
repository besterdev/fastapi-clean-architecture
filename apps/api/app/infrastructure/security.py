from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
import jwt

from app.domain.entities import TokenClaims, TokenPair
from app.domain.errors import InvalidToken
from app.infrastructure.config import Settings


class BcryptPasswordHasher:
    def hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()

    def verify(self, password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode(), password_hash.encode())
        except ValueError:
            return False


class JWTTokenProvider:
    def __init__(self, settings: Settings):
        self.settings = settings

    def issue(self, user_id: int, refresh_expires_at: int | None = None) -> TokenPair:
        now = int(datetime.now(timezone.utc).timestamp())

        def encode(kind: str, expiry: int) -> str:
            return jwt.encode(
                {
                    "claims": {"id": user_id},
                    "sub": f"{kind}-token",
                    "iss": self.settings.jwt_issuer,
                    "aud": ["user", "admin"],
                    "iat": now,
                    "nbf": now,
                    "exp": expiry,
                    "jti": str(uuid4()),
                },
                self.settings.secret_key.get_secret_value(),
                algorithm="HS256",
            )

        return TokenPair(
            encode("access", now + self.settings.access_token_seconds),
            encode("refresh", refresh_expires_at or now + self.settings.refresh_token_seconds),
        )

    def decode(self, token: str, kind: str) -> TokenClaims:
        try:
            claims = jwt.decode(
                token,
                self.settings.secret_key.get_secret_value(),
                algorithms=["HS256"],
                issuer=self.settings.jwt_issuer,
                audience="user",
                options={"require": ["exp", "iat", "nbf", "iss", "aud", "sub", "jti"]},
            )
            user_id = claims["claims"]["id"]
            if claims["sub"] != f"{kind}-token" or type(user_id) is not int or user_id <= 0:
                raise InvalidToken("Invalid token")
            return TokenClaims(user_id, int(claims["exp"]))
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
            raise InvalidToken("Invalid or expired token") from exc
