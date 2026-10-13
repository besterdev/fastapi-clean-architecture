class ApplicationError(Exception):
    """Errors with meaning independent of HTTP or database drivers."""


class EmailAlreadyExists(ApplicationError):
    pass


class InvalidCredentials(ApplicationError):
    pass


class InvalidToken(ApplicationError):
    pass


class NotFound(ApplicationError):
    pass
