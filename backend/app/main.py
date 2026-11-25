from __future__ import annotations

"""FastAPI application entry point."""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables, engine, get_db
from app.services.cache_service import initialize_cache, is_cache_enabled

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Lyftr AI Chatbot Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting Lyftr AI backend…")
    create_tables()
    initialize_cache()
    logger.info("Startup complete.")


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    # Verify DB reachable
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database unreachable: {exc}")

    keys_configured = sum(
        1
        for k in (settings.GEMINI_API_KEY_1, settings.GEMINI_API_KEY_2)
        if k and k.strip()
    )
    if keys_configured == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="No API keys configured")

    return {
        "status": "ok",
        "keys_configured": keys_configured,
        "cache_enabled": is_cache_enabled(),
    }


# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
from app.api.routes import router  # noqa: E402

app.include_router(router)
