from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import query, upload
from app.core.config import settings

app = FastAPI(
    title="NaturalQL",
    description="Natural language to SQL query engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api/query", tags=["Query"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
