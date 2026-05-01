"""
engine.py — Full NaturalQL pipeline.

Steps:
  1. Load schema (from cache or live DB introspection)
  2. Check memory for a similar past query
  3. Build system prompt + user message
  4. Call Groq LLM to get raw SQL
  5. Validate / sanitise the SQL
  6. Execute against the DB
  7. Remember successful pair in memory cache
  8. Return structured result
"""
from typing import Any
from app.core import llm, schema as schema_mod, context, security, memory
from app.core.config import settings
from app.db.base import DatabaseAdapter
from app.db.sqlite import SQLiteAdapter
from app.db.postgres import PostgresAdapter
from app.db.mysql import MySQLAdapter
import logging

logger = logging.getLogger(__name__)


def _get_adapter(db_type: str | None = None, db_path: str | None = None) -> DatabaseAdapter:
    kind = (db_type or settings.DB_TYPE).lower()
    # db_path doubles as a DSN for postgres/mysql when passed from the frontend
    if kind == "sqlite":
        return SQLiteAdapter(db_path)
    if kind == "postgres":
        return PostgresAdapter(dsn=db_path or settings.POSTGRES_URL or None)
    if kind == "mysql":
        return MySQLAdapter(dsn=db_path or settings.MYSQL_URL or None)
    raise ValueError(f"Unsupported DB type: {kind}")


def run_pipeline(
    question: str,
    db_type: str | None = None,
    db_path: str | None = None,
    history: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Execute the full NL → SQL → Results pipeline.

    Returns:
        {
            "sql": str,
            "rows": list[dict],
            "row_count": int,
            "from_cache": bool,
        }
    """
    adapter = _get_adapter(db_type, db_path)
    adapter.connect()

    try:
        # ── 1. Schema ─────────────────────────────────────────────────────
        db_id = db_path or db_type or settings.DB_TYPE
        cached_schema = schema_mod.load_schema_cache(db_id)
        if cached_schema:
            db_schema = cached_schema
        else:
            db_schema = adapter.get_schema()
            schema_mod.save_schema_cache(db_schema, db_id)

        # ── 2. Memory hint ────────────────────────────────────────────────
        mem_hint = memory.hint(question)

        # ── 3. Prompts ────────────────────────────────────────────────────
        system_prompt = context.build_system_prompt(db_schema, settings.MAX_ROWS_RETURNED)
        user_message = context.build_user_message(question, history, mem_hint)

        # ── 4. LLM call ───────────────────────────────────────────────────
        raw_sql = llm.generate_sql(system_prompt, user_message)
        logger.info(f"LLM output: {raw_sql!r}")

        # ── 5. Validation ─────────────────────────────────────────────────
        clean_sql = security.validate_sql(raw_sql)

        # ── 6. Execute ────────────────────────────────────────────────────
        rows = adapter.execute_query(clean_sql)
        rows = rows[: settings.MAX_ROWS_RETURNED]

        # ── 7. Remember ───────────────────────────────────────────────────
        memory.remember(question, clean_sql)

        return {
            "sql": clean_sql,
            "rows": rows,
            "row_count": len(rows),
            "from_cache": False,
        }

    finally:
        adapter.disconnect()
