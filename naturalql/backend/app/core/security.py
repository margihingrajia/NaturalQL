import re
import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import Keyword, DDL, DML

# Statements that must never be executed
FORBIDDEN_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
    "CREATE", "TRUNCATE", "REPLACE", "MERGE", "EXEC",
    "EXECUTE", "GRANT", "REVOKE", "ATTACH", "DETACH",
}


class SQLSecurityError(ValueError):
    """Raised when a generated SQL statement fails safety checks."""


def _extract_keywords(statement: Statement) -> set[str]:
    return {
        token.normalized.upper()
        for token in statement.flatten()
        if token.ttype in (Keyword, DDL, DML)
    }


def validate_sql(sql: str) -> str:
    """
    Parse and validate the SQL string. Returns the cleaned SQL or raises
    SQLSecurityError if a forbidden operation is detected.
    """
    sql = sql.strip().rstrip(";")

    # Strip markdown code fences if LLM slipped them in
    sql = re.sub(r"^```(?:sql)?", "", sql, flags=re.IGNORECASE).strip()
    sql = re.sub(r"```$", "", sql).strip()

    if not sql:
        raise SQLSecurityError("Empty SQL returned by model.")

    parsed = sqlparse.parse(sql)
    if not parsed:
        raise SQLSecurityError("Could not parse SQL.")

    for statement in parsed:
        found = _extract_keywords(statement) & FORBIDDEN_KEYWORDS
        if found:
            raise SQLSecurityError(
                f"Forbidden SQL operation detected: {', '.join(found)}"
            )

    # Allow only a single statement
    statements = [s for s in parsed if str(s).strip()]
    if len(statements) > 1:
        raise SQLSecurityError("Multiple SQL statements are not allowed.")

    return sql
