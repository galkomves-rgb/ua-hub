import pytest
from sqlalchemy.exc import ProgrammingError

from core.database import DatabaseManager


class _FakeDuplicateTableError(Exception):
    pass


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (_FakeDuplicateTableError("relation already exists"), True),
        (ProgrammingError("CREATE TABLE x", {}, _FakeDuplicateTableError('relation "moderation_audit_logs" already exists')), True),
        (ProgrammingError("CREATE TABLE x", {}, Exception("syntax error")), False),
    ],
)
def test_is_duplicate_table_error_detects_wrapped_duplicate(error, expected):
    assert DatabaseManager._is_duplicate_table_error(error) is expected
