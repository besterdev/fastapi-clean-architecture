from dataclasses import asdict
from hashlib import sha256

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.entities import Account, DataPage, TokenPair, User
from app.domain.errors import EmailAlreadyExists
from app.infrastructure.models import UserModel, UserPermissionModel, UserTokenModel, as_utc, utcnow


def fingerprint(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def to_user(model: UserModel) -> User:
    return User(
        model.id,
        model.email,
        model.first_name,
        model.last_name,
        as_utc(model.created_at),
        as_utc(model.updated_at),
    )


class SQLUserRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_email(self, email: str) -> Account | None:
        model = self.session.scalar(select(UserModel).where(UserModel.email == email))
        return Account(to_user(model), model.password) if model else None

    def find_by_id(self, user_id: int) -> Account | None:
        model = self.session.get(UserModel, user_id)
        return Account(to_user(model), model.password) if model else None

    def add(self, email: str, password_hash: str, first_name: str, last_name: str) -> User:
        model = UserModel(
            email=email, password=password_hash, first_name=first_name, last_name=last_name
        )
        self.session.add(model)
        try:
            self.session.flush()
        except IntegrityError as exc:
            self.session.rollback()
            # The registration insert can violate the email unique constraint.
            raise EmailAlreadyExists("Email already registered") from exc
        return to_user(model)

    def save_tokens(self, user_id: int, access: str, refresh: str) -> None:
        insert = sqlite_insert if self.session.bind.dialect.name == "sqlite" else pg_insert
        statement = insert(UserTokenModel).values(
            user_id=user_id,
            access=fingerprint(access),
            refresh=fingerprint(refresh),
            updated_at=utcnow(),
        )
        self.session.execute(
            statement.on_conflict_do_update(
                index_elements=["user_id"],
                set_={
                    "access": statement.excluded.access,
                    "refresh": statement.excluded.refresh,
                    "updated_at": statement.excluded.updated_at,
                },
            )
        )

    def has_access(self, user_id: int, token: str) -> bool:
        return (
            self.session.scalar(
                select(UserTokenModel.id).where(
                    UserTokenModel.user_id == user_id, UserTokenModel.access == fingerprint(token)
                )
            )
            is not None
        )

    def has_refresh(self, user_id: int, token: str) -> bool:
        return (
            self.session.scalar(
                select(UserTokenModel.id).where(
                    UserTokenModel.user_id == user_id, UserTokenModel.refresh == fingerprint(token)
                )
            )
            is not None
        )

    def rotate_tokens(self, user_id: int, previous: str, tokens: TokenPair) -> bool:
        result = self.session.execute(
            update(UserTokenModel)
            .where(
                UserTokenModel.user_id == user_id, UserTokenModel.refresh == fingerprint(previous)
            )
            .values(
                access=fingerprint(tokens.access),
                refresh=fingerprint(tokens.refresh),
                updated_at=utcnow(),
            )
        )
        return result.rowcount == 1

    def delete_tokens(self, user_id: int, refresh: str) -> bool:
        result = self.session.execute(
            delete(UserTokenModel).where(
                UserTokenModel.user_id == user_id, UserTokenModel.refresh == fingerprint(refresh)
            )
        )
        return result.rowcount == 1

    def commit(self) -> None:
        self.session.commit()


class SQLDataRepository:
    """Explicit resources and ownership; no arbitrary table or column access."""

    models = {
        "users": UserModel,
        "user-tokens": UserTokenModel,
        "user-permissions": UserPermissionModel,
    }

    def __init__(self, session: Session):
        self.session = session

    def _query(self, resource: str, user_id: int):
        model = self.models[resource]
        owner = model.id if resource == "users" else model.user_id
        return select(model).where(owner == user_id)

    def _serialize(self, model) -> dict:
        if isinstance(model, UserModel):
            return asdict(to_user(model))
        result = {"id": model.id, "user_id": model.user_id, "updated_at": as_utc(model.updated_at)}
        if isinstance(model, UserPermissionModel):
            result["permission"] = model.permission
        return result

    def list(self, resource: str, user_id: int, page: int, size: int) -> DataPage:
        query = self._query(resource, user_id)
        total = self.session.scalar(select(func.count()).select_from(query.subquery()))
        rows = self.session.scalars(
            query.order_by(self.models[resource].id).offset((page - 1) * size).limit(size)
        ).all()
        return DataPage([self._serialize(row) for row in rows], total)

    def get(self, resource: str, user_id: int, record_id: int) -> dict | None:
        model = self.session.scalar(
            self._query(resource, user_id).where(self.models[resource].id == record_id)
        )
        return self._serialize(model) if model else None
