try:
    import mysql.connector
    HAS_MYSQL = True
except ImportError:
    HAS_MYSQL = False

from typing import Any
from app.db.base import DatabaseAdapter
from app.core.schema import SchemaMap
from app.core.config import settings


class MySQLAdapter(DatabaseAdapter):

    def __init__(self, dsn: str | None = None):
        if not HAS_MYSQL:
            raise RuntimeError("mysql-connector-python is not installed. Run: python -m pip install mysql-connector-python")
        self._dsn = dsn or settings.MYSQL_URL
        self._conn = None

    def _parse_dsn(self) -> dict:
        from urllib.parse import urlparse
        p = urlparse(self._dsn)
        return {"host": p.hostname, "port": p.port or 3306,
                "user": p.username, "password": p.password,
                "database": p.path.lstrip("/")}

    def connect(self) -> None:
        self._conn = mysql.connector.connect(**self._parse_dsn())

    def disconnect(self) -> None:
        if self._conn and self._conn.is_connected():
            self._conn.close()
            self._conn = None

    def is_connected(self) -> bool:
        return self._conn is not None and self._conn.is_connected()

    def get_schema(self) -> SchemaMap:
        assert self._conn, "Not connected"
        db = self._parse_dsn()["database"]
        query = f"""
            SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE,
                IF(kcu.COLUMN_NAME IS NOT NULL, TRUE, FALSE) AS is_pk
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
                AND kcu.CONSTRAINT_NAME = 'PRIMARY' AND kcu.TABLE_SCHEMA = '{db}'
            WHERE c.TABLE_SCHEMA = '{db}'
            ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        """
        cur = self._conn.cursor(dictionary=True)
        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        schema: SchemaMap = {}
        for row in rows:
            table = row["TABLE_NAME"]
            schema.setdefault(table, []).append(
                {"name": row["COLUMN_NAME"], "type": row["DATA_TYPE"], "pk": bool(row["is_pk"])}
            )
        return schema

    def execute_query(self, sql: str) -> list[dict[str, Any]]:
        assert self._conn, "Not connected"
        cur = self._conn.cursor(dictionary=True)
        cur.execute(sql)
        rows = cur.fetchall()
        cur.close()
        return rows
