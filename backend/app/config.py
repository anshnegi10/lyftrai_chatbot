from __future__ import annotations

import logging
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    DATABASE_URL: str = "sqlite:////data/app.db"
    ENABLE_FAILURE_SIMULATION: bool = False
    CORS_ORIGINS: List[str] = ["*"]
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("GEMINI_API_KEY_1", "GEMINI_API_KEY_2", mode="before")
    @classmethod
    def _not_empty(cls, v: str) -> str:
        # Allow empty during test bootstrap; real startup validates via health endpoint
        return v or ""


settings = Settings()
