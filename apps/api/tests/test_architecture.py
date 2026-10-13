import ast
import sys
from pathlib import Path


def test_inner_layers_depend_only_on_stdlib_and_inner_layers():
    for layer in ("domain", "application"):
        for path in ((Path(__file__).resolve().parents[1] / "app") / layer).glob("*.py"):
            for node in ast.walk(ast.parse(path.read_text())):
                modules = []
                if isinstance(node, ast.Import):
                    modules = [alias.name for alias in node.names]
                elif isinstance(node, ast.ImportFrom):
                    modules = [node.module or ""]
                for module in modules:
                    if not module.startswith("app."):
                        assert module.split(".")[0] in sys.stdlib_module_names, str(path)
                    else:
                        allowed = (
                            ("app.domain",)
                            if layer == "domain"
                            else ("app.domain", "app.application")
                        )
                        assert module.startswith(allowed), f"{path}: forbidden dependency {module}"
                    assert not module.startswith(
                        (
                            "fastapi",
                            "pydantic",
                            "sqlalchemy",
                            "app.infrastructure",
                            "app.presentation",
                        )
                    ), f"{path}: forbidden dependency {module}"
                    if layer == "domain":
                        assert not module.startswith("app.application"), str(path)
