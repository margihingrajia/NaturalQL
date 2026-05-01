from typing import Dict, List
import json
import os
from app.core.config import settings

# Schema structure:
# { "table_name": [{"name": "col", "type": "TEXT", "pk": False}, ...] }
SchemaMap = Dict[str, List[Dict]]


def parse_schema_from_rows(raw: List[tuple]) -> SchemaMap:
    """
    Convert raw PRAGMA / INFORMATION_SCHEMA rows into a SchemaMap.
    Expected format per row: (table_name, column_name, data_type, is_pk)
    """
    schema: SchemaMap = {}
    for row in raw:
        table, col, dtype, pk = row
        schema.setdefault(table, []).append({"name": col, "type": dtype, "pk": bool(pk)})
    return schema


def schema_to_text(schema: SchemaMap) -> str:
    """
    Render schema as a compact CREATE TABLE-like string for prompt injection.
    """
    lines = []
    for table, cols in schema.items():
        col_defs = ", ".join(
            f"{c['name']} {c['type']}{'(PK)' if c['pk'] else ''}" for c in cols
        )
        lines.append(f"Table {table}({col_defs})")
    return "\n".join(lines)


def save_schema_cache(schema: SchemaMap, db_id: str) -> None:
    cache_path = settings.SCHEMA_CACHE_PATH
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    try:
        with open(cache_path, "r") as f:
            cache = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        cache = {}
    cache[db_id] = schema
    with open(cache_path, "w") as f:
        json.dump(cache, f, indent=2)


def load_schema_cache(db_id: str) -> SchemaMap | None:
    try:
        with open(settings.SCHEMA_CACHE_PATH) as f:
            cache = json.load(f)
        return cache.get(db_id)
    except (FileNotFoundError, json.JSONDecodeError):
        return None
