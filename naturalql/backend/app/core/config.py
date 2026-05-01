from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-70b-8192"

    # Database defaults
    DB_TYPE: str = "sqlite"           # sqlite | postgres | mysql
    SQLITE_PATH: str = "database/uploads/default.db"
    POSTGRES_URL: str = ""
    MYSQL_URL: str = ""

    # App
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    SCHEMA_CACHE_PATH: str = "database/schema_cache.json"
    MAX_ROWS_RETURNED: int = 500

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
