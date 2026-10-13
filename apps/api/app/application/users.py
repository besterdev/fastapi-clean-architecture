from app.domain.entities import LoginResult, User
from app.domain.errors import EmailAlreadyExists, InvalidCredentials, InvalidToken
from app.domain.ports import PasswordHasher, TokenProvider, UserRepository


class UserService:
    def __init__(
        self, repository: UserRepository, passwords: PasswordHasher, tokens: TokenProvider
    ):
        self.repository = repository
        self.passwords = passwords
        self.tokens = tokens

    def register(self, email: str, password: str, first_name: str, last_name: str) -> User:
        email = email.lower()
        if self.repository.find_by_email(email):
            raise EmailAlreadyExists("Email already registered")
        user = self.repository.add(email, self.passwords.hash(password), first_name, last_name)
        self.repository.commit()
        return user

    def login(self, email: str, password: str) -> LoginResult:
        account = self.repository.find_by_email(email.lower())
        if account is None or not self.passwords.verify(password, account.password_hash):
            raise InvalidCredentials("Invalid email or password")
        tokens = self.tokens.issue(account.user.id)
        self.repository.save_tokens(account.user.id, tokens.access, tokens.refresh)
        self.repository.commit()
        return LoginResult(account.user, tokens)

    def authenticate(self, access: str) -> User:
        claims = self.tokens.decode(access, "access")
        if not self.repository.has_access(claims.user_id, access):
            raise InvalidToken("Session is no longer active")
        account = self.repository.find_by_id(claims.user_id)
        if account is None:
            raise InvalidToken("Session is no longer active")
        return account.user

    def refresh(self, refresh: str) -> LoginResult:
        claims = self.tokens.decode(refresh, "refresh")
        if not self.repository.has_refresh(claims.user_id, refresh):
            raise InvalidToken("Session is no longer active")
        account = self.repository.find_by_id(claims.user_id)
        if account is None:
            raise InvalidToken("Session is no longer active")
        # Rotate both tokens without extending the original refresh deadline.
        tokens = self.tokens.issue(claims.user_id, claims.expires_at)
        if not self.repository.rotate_tokens(claims.user_id, refresh, tokens):
            raise InvalidToken("Refresh token has already been used")
        self.repository.commit()
        return LoginResult(account.user, tokens)

    def logout(self, refresh: str) -> None:
        claims = self.tokens.decode(refresh, "refresh")
        if not self.repository.delete_tokens(claims.user_id, refresh):
            raise InvalidToken("Session is no longer active")
        self.repository.commit()
