# NaturalQL

> Convert natural language questions into SQL queries using Groq's LLaMA 3 — with live execution against SQLite, PostgreSQL, or MySQL.

---

## Architecture

```
User Question
     │
     ▼
  FastAPI  ──►  Memory Cache (fuzzy lookup)
     │
     ▼
  Schema Parser  ──►  schema_cache.json
     │
     ▼
  Prompt Builder  (schema + history + hint)
     │
     ▼
  Groq LLM  (llama3-70b-8192)
     │
     ▼
  SQL Validator  (sqlparse, blocklist)
     │
     ▼
  DB Adapter  (SQLite / Postgres / MySQL)
     │
     ▼
  JSON Results  ──►  React Frontend
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env .env.local          # fill in GROQ_API_KEY
bash run.sh
```

API available at **http://localhost:8000**
Swagger docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at **http://localhost:5173**

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | *(required)* | Groq API key |
| `GROQ_MODEL` | `llama3-70b-8192` | Groq model ID |
| `DB_TYPE` | `sqlite` | `sqlite` \| `postgres` \| `mysql` |
| `SQLITE_PATH` | `database/uploads/default.db` | Path to SQLite file |
| `POSTGRES_URL` | — | `postgresql://user:pass@host/db` |
| `MYSQL_URL` | — | `mysql://user:pass@host/db` |
| `MAX_ROWS_RETURNED` | `500` | Max result rows per query |

---

## API Endpoints

### `POST /api/query/`

```json
{
  "question": "Show me the top 5 users by order count",
  "db_type": "sqlite",
  "db_path": "database/uploads/mydb.db",
  "history": []
}
```

Response:
```json
{
  "sql": "SELECT user_id, COUNT(*) AS order_count FROM orders GROUP BY user_id ORDER BY order_count DESC LIMIT 5",
  "rows": [...],
  "row_count": 5,
  "from_cache": false
}
```

### `POST /api/upload/db`

Multipart form upload of a `.db` / `.sqlite` file.
Returns `{ db_path, db_id, tables, message }`.

---

## Security

- **Read-only enforcement**: `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `CREATE`, `TRUNCATE` and other write/DDL keywords are blocked via `sqlparse` token inspection before any query is executed.
- **Single statement only**: Multi-statement attacks are rejected.
- **Markdown stripping**: Code fences in LLM output are cleaned before parsing.

---

## File Map

```
backend/app/
  main.py          FastAPI app + CORS + routers
  core/
    config.py      Pydantic Settings (env loader)
    llm.py         Groq client wrapper
    schema.py      DB schema → SchemaMap + cache
    context.py     System prompt + user message builder
    security.py    SQL validation & blocklist
    memory.py      In-process LRU learning cache
  db/
    base.py        Abstract DatabaseAdapter interface
    sqlite.py      SQLite adapter
    postgres.py    PostgreSQL adapter (psycopg2)
    mysql.py       MySQL adapter (mysql-connector)
  routes/
    query.py       POST /api/query/
    upload.py      POST /api/upload/db
  services/
    engine.py      Full NL→SQL→Results pipeline
```
