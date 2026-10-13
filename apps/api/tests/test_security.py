import bcrypt
import jwt
import pytest

from app.domain.errors import InvalidToken
from app.infrastructure.config import Settings
from app.infrastructure.security import BcryptPasswordHasher, JWTTokenProvider


@pytest.fixture
def settings():
    return Settings(_env_file=None, secret_key="test-only-secret-" * 4)


@pytest.mark.parametrize(
    "changes",
    [
        {"iss": "other-app"},
        {"aud": "other-audience"},
        {"claims": {"id": True}},
        {"claims": {"id": "1"}},
        {"claims": []},
    ],
)
def test_signed_tokens_with_invalid_claims_are_rejected(settings, changes):
    provider = JWTTokenProvider(settings)
    payload = jwt.decode(provider.issue(1).access, options={"verify_signature": False})
    token = jwt.encode({**payload, **changes}, settings.secret_key.get_secret_value(), "HS256")
    with pytest.raises(InvalidToken):
        provider.decode(token, "access")


def test_missing_expiration_and_wrong_algorithm_are_rejected(settings):
    provider = JWTTokenProvider(settings)
    payload = jwt.decode(provider.issue(1).access, options={"verify_signature": False})
    token = jwt.encode(payload, settings.secret_key.get_secret_value(), "HS512")
    with pytest.raises(InvalidToken):
        provider.decode(token, "access")
    del payload["exp"]
    token = jwt.encode(payload, settings.secret_key.get_secret_value(), "HS256")
    with pytest.raises(InvalidToken):
        provider.decode(token, "access")


def test_go_bcrypt_hash_is_supported():
    # Go's x/crypto/bcrypt uses the $2a$ prefix.
    password_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt(prefix=b"2a", rounds=10))
    assert BcryptPasswordHasher().verify("password123", password_hash.decode())


def test_secret_required_and_placeholder_rejected():
    for secret in ("short", "replace-with-a-random-secret-at-least-32-characters"):
        with pytest.raises(ValueError):
            Settings(_env_file=None, secret_key=secret)
