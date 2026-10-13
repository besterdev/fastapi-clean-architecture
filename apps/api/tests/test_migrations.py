from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect


def test_schema_matches_models_and_can_be_rebuilt(app):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.check(config)
    command.downgrade(config, "base")
    assert "users" not in inspect(app.state.engine).get_table_names()
    command.upgrade(config, "head")
    assert {"users", "user_tokens", "user_permissions"}.issubset(
        inspect(app.state.engine).get_table_names()
    )
