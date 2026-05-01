"""
base.py — Abstract database interface.

All DB adapters (SQLite, Postgres, MySQL) must subclass DatabaseAdapter
and implement every abstract method. The rest of the application depends
only on this interface — never on a concrete adapter directly.
"""
from abc import ABC, abstractmethod
from typing import Any
from app.core.schema import SchemaMap


class DatabaseAdapter(ABC):

    # ── Connection lifecycle ──────────────────────────────────────────────

    @abstractmethod
    def connect(self) -> None:
        """Open a connection / connection pool."""

    @abstractmethod
    def disconnect(self) -> None:
        """Close the connection / pool gracefully."""

    @abstractmethod
    def is_connected(self) -> bool:
        """Return True if the adapter has a live connection."""

    # ── Schema introspection ──────────────────────────────────────────────

    @abstractmethod
    def get_schema(self) -> SchemaMap:
        """
        Introspect the database and return a SchemaMap:
        { table_name: [{"name": col, "type": dtype, "pk": bool}] }
        """

    # ── Query execution ───────────────────────────────────────────────────

    @abstractmethod
    def execute_query(self, sql: str) -> list[dict[str, Any]]:
        """
        Run a read-only SQL query and return rows as a list of dicts.
        Must raise RuntimeError if a write statement is attempted.
        """

    # ── Helpers ───────────────────────────────────────────────────────────

    def __enter__(self) -> "DatabaseAdapter":
        self.connect()
        return self

    def __exit__(self, *_) -> None:
        self.disconnect()
