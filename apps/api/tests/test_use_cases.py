from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from app.application.data import DataService
from app.application.users import UserService
from app.domain.entities import Account, TokenClaims, TokenPair, User
from app.domain.errors import InvalidCredentials, InvalidToken, NotFound
from app.domain.ports import DataRepository, PasswordHasher, TokenProvider, UserRepository


def user():
    now = datetime.now(timezone.utc)
    return User(1, "mac@example.com", "Mac", "Dev", now, now)


def test_register_uses_ports_without_http_or_database():
    repository = Mock(spec=UserRepository)
    passwords = Mock(spec=PasswordHasher)
    repository.find_by_email.return_value = None
    repository.add.return_value = user()
    passwords.hash.return_value = "hashed"
    service = UserService(repository, passwords, Mock(spec=TokenProvider))
    result = service.register("MAC@example.com", "secret", "Mac", "Dev")
    assert result.email == "mac@example.com"
    repository.add.assert_called_once_with("mac@example.com", "hashed", "Mac", "Dev")
    repository.commit.assert_called_once()


def test_bad_password_does_not_issue_or_persist_tokens():
    repository = Mock(spec=UserRepository)
    passwords = Mock(spec=PasswordHasher)
    tokens = Mock(spec=TokenProvider)
    repository.find_by_email.return_value = Account(user(), "hash")
    passwords.verify.return_value = False
    with pytest.raises(InvalidCredentials):
        UserService(repository, passwords, tokens).login("mac@example.com", "bad")
    tokens.issue.assert_not_called()
    repository.save_tokens.assert_not_called()
    repository.commit.assert_not_called()


def test_lost_refresh_race_is_rejected_without_commit():
    repository = Mock(spec=UserRepository)
    tokens = Mock(spec=TokenProvider)
    repository.has_refresh.return_value = True
    repository.find_by_id.return_value = Account(user(), "hash")
    repository.rotate_tokens.return_value = False
    tokens.decode.return_value = TokenClaims(1, 1234567890)
    tokens.issue.return_value = TokenPair("new-access", "new-refresh")
    with pytest.raises(InvalidToken):
        UserService(repository, Mock(spec=PasswordHasher), tokens).refresh("old-refresh")
    tokens.issue.assert_called_once_with(1, 1234567890)
    repository.commit.assert_not_called()


def test_unknown_resource_never_reaches_database():
    repository = Mock(spec=DataRepository)
    with pytest.raises(NotFound):
        DataService(repository).list("arbitrary-table", 1, 1, 10)
    repository.list.assert_not_called()
