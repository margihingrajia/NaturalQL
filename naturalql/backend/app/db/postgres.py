try:
    import psycopg2
    import psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

from typing import Any
from app.db.base import DatabaseAdapter
from app.core.schema import SchemaMap
from app.core.config import settings


class PostgresAdapter(DatabaseAdapter):

    def __init__(self, dsn: str | None = None):
        if not HAS_PSYCOPG2:
            raise RuntimeError("psycopg2 is not installed. Run: python -m pip install psycopg2-binary")
        self._dsn = dsn or settings.POSTGRES_URL
        self._conn = None

    def connect(self) -> None:
        self._conn = psycopg2.connect(self._dsn)
        self._conn.autocommit = True

    def disconnect(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def is_connected(self) -> bool:
        return self._conn is not None and not self._conn.closed

    def get_schema(self) -> SchemaMap:
        assert self._conn, "Not connected"
        query = """
            SELECT c.table_name, c.column_name, c.data_type,
                CASE WHEN kcu.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS is_pk
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu
                ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
                AND kcu.constraint_name IN (
                    SELECT constraint_name FROM information_schema.table_constraints
                    WHERE constraint_type = 'PRIMARY KEY')
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position
        """
        with self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query)
            rows = cur.fetchall()
        schema: SchemaMap = {}
        for row in rows:
            table = row["table_name"]
            schema.setdefault(table, []).append(
                {"name": row["column_name"], "type": row["data_type"], "pk": row["is_pk"]}
            )
        return schema

    def execute_query(self, sql: str) -> list[dict[str, Any]]:
        assert self._conn, "Not connected"
        with self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql)
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
