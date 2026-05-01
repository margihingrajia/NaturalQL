from app.core.schema import SchemaMap, schema_to_text

SYSTEM_TEMPLATE = """\
You are NaturalQL, an expert SQL assistant.
Your ONLY job is to convert the user's natural language question into a valid SQL query.

Rules:
1. Output ONLY the raw SQL query — no explanations, no markdown, no code fences.
2. Use only tables and columns present in the schema below.
3. Never use DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, TRUNCATE, or any write/DDL statement.
4. Use table aliases when joining.
5. Limit results to {max_rows} rows unless the user explicitly asks for all.

Schema:
{schema_text}
"""


def build_system_prompt(schema: SchemaMap, max_rows: int = 500) -> str:
    return SYSTEM_TEMPLATE.format(
        schema_text=schema_to_text(schema),
        max_rows=max_rows,
    )


def build_user_message(
    question: str,
    history: list[dict] | None = None,
    memory_hint: str | None = None,
) -> str:
    """
    Compose the user turn, optionally prepending conversation history
    and any learned corrections from memory.
    """
    parts = []

    if memory_hint:
        parts.append(f"[Context from previous sessions]: {memory_hint}")

    if history:
        for turn in history[-4:]:          # last 4 exchanges max
            role = turn.get("role", "user")
            content = turn.get("content", "")
            parts.append(f"[{role.upper()}]: {content}")

    parts.append(f"Question: {question}")
    return "\n".join(parts)
