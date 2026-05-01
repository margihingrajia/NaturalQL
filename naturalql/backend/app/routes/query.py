from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from app.services.engine import run_pipeline
from app.core.security import SQLSecurityError
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    db_type: str | None = None        # sqlite | postgres | mysql
    db_path: str | None = None        # path for SQLite uploads
    history: list[dict] | None = None # conversation history


class QueryResponse(BaseModel):
    sql: str
    rows: list[dict[str, Any]]
    row_count: int
    from_cache: bool


@router.post("/", response_model=QueryResponse)
async def natural_query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        result = run_pipeline(
            question=req.question,
            db_type=req.db_type,
            db_path=req.db_path,
            history=req.history,
        )
        return QueryResponse(**result)
    except SQLSecurityError as e:
        raise HTTPException(status_code=400, detail=f"Security error: {e}")
    except Exception as e:
        logger.exception("Pipeline error")
        raise HTTPException(status_code=500, detail=str(e))
