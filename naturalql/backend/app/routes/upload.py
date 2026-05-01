import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings
from app.db.sqlite import SQLiteAdapter
from app.core.schema import save_schema_cache

router = APIRouter()

UPLOAD_DIR = "database/uploads"
ALLOWED_EXTENSIONS = {".db", ".sqlite", ".sqlite3"}


@router.post("/db")
async def upload_database(file: UploadFile = File(...)):
    """
    Upload a SQLite database file. Returns a db_path token to use in /api/query.
    """
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    db_id = str(uuid.uuid4())
    dest_path = os.path.join(UPLOAD_DIR, f"{db_id}{ext}")

    try:
        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Pre-cache the schema
    try:
        adapter = SQLiteAdapter(dest_path)
        adapter.connect()
        schema = adapter.get_schema()
        adapter.disconnect()
        save_schema_cache(schema, dest_path)
    except Exception as e:
        os.remove(dest_path)
        raise HTTPException(status_code=400, detail=f"Invalid SQLite file: {e}")

    return {
        "db_path": dest_path,
        "db_id": db_id,
        "tables": list(schema.keys()),
        "message": "Database uploaded and schema cached successfully.",
    }
