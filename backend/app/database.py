from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def _get_engine():
    connect_args = {}
    if settings.DATABASE_URL.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        echo=False,
    )
    # Enable WAL mode for SQLite to improve concurrent read performance
    if settings.DATABASE_URL.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()
    return engine


engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    """Create all tables (called at startup)."""
    # Import models so SQLAlchemy knows about them
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
