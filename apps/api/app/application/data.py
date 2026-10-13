from app.domain.entities import DataPage
from app.domain.errors import NotFound
from app.domain.ports import DataRepository

RESOURCES = frozenset({"users", "user-tokens", "user-permissions"})


class DataService:
    def __init__(self, repository: DataRepository):
        self.repository = repository

    def check_resource(self, resource: str) -> None:
        if resource not in RESOURCES:
            raise NotFound("Resource not found")

    def list(self, resource: str, user_id: int, page: int, size: int) -> DataPage:
        self.check_resource(resource)
        return self.repository.list(resource, user_id, page, size)

    def get(self, resource: str, user_id: int, record_id: int) -> dict:
        self.check_resource(resource)
        result = self.repository.get(resource, user_id, record_id)
        if result is None:
            raise NotFound("Record not found")
        return result
