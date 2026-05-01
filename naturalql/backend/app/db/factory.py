from app.db.sqlite import SQLiteDB
from app.db.postgres import PostgresDB
from app.db.mysql import MySQLDB
from app.core.config import DEFAULT_DB, SQLITE_PATH, POSTGRES_URL, MYSQL_URL

import os

def get_db():
    mode = os.getenv("DEFAULT_DB")

    if mode == "sqlite":
        return SQLiteDB(os.getenv("SQLITE_PATH"))

    if mode == "postgres":
        return PostgresDB(os.getenv("POSTGRES_URL"))

    if mode == "mysql":
        return MySQLDB(os.getenv("MYSQL_URL"))