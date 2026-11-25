from __future__ import annotations

"""Conversation persistence helpers (SQLite via SQLAlchemy)."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import Message

logger = logging.getLogger(__name__)


def session_exists(session_id: str, db: Session) -> bool:
    return db.query(Message).filter(Message.session_id == session_id).first() is not None


def get_session_history(session_id: str, db: Session) -> List[Message]:
    """Return all messages for the session ordered oldest-first."""
    return (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.id.asc())
        .all()
    )


def save_message(
    session_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]],
    db: Session,
) -> Message:
    record = Message(
        session_id=session_id,
        role=role,
        content=content,
        meta_json=json.dumps(metadata) if metadata else None,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
