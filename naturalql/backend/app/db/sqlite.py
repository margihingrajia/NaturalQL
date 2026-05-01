import sqlite3
from typing import Any
from app.db.base import DatabaseAdapter
from app.core.schema import SchemaMap
from app.core.config import settings


class SQLiteAdapter(DatabaseAdapter):

    def __init__(self, db_path: str | None = None):
        self._path = db_path or settings.SQLITE_PATH
        self._conn: sqlite3.Connection | None = None

    def connect(self) -> None:
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row

    def disconnect(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def is_connected(self) -> bool:
        return self._conn is not None

    def get_schema(self) -> SchemaMap:
        assert self._conn, "Not connected"
        cur = self._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in cur.fetchall()]
        schema: SchemaMap = {}
        for table in tables:
            info = self._conn.execute(f"PRAGMA table_info({table})").fetchall()
            schema[table] = [
                {"name": row["name"], "type": row["type"], "pk": bool(row["pk"])}
                for row in info
            ]
        return schema

    def execute_query(self, sql: str) -> list[dict[str, Any]]:
        assert self._conn, "Not connected"
        cur = self._conn.execute(sql)
        columns = [desc[0] for desc in cur.description]
        return [dict(zip(columns, row)) for row in cur.fetchall()]
