from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=4000)
    system_prompt: Optional[str] = None

    @field_validator("message", mode="before")
    @classmethod
    def _strip_message(cls, v: str) -> str:
        stripped = v.strip() if isinstance(v, str) else v
        if not stripped:
            raise ValueError("message must not be empty after stripping whitespace")
        return stripped


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class MessageMetadata(BaseModel):
    resolution_source: Literal["LIVE_INFERENCE", "LLM_CACHE"]
    model: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    key_id: Optional[str]
    fallback_attempts: int


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    metadata: MessageMetadata


# ---------------------------------------------------------------------------
# Session history schemas
# ---------------------------------------------------------------------------


class MessageOutMetadata(BaseModel):
    resolution_source: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class MessageOut(BaseModel):
    role: str
    content: str
    metadata: Optional[MessageOutMetadata] = None


class SessionHistory(BaseModel):
    session_id: str
    messages: List[MessageOut]
