from __future__ import annotations

"""pytest configuration and shared fixtures."""

import os
import sys
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure environment vars are set before importing app modules
os.environ.setdefault("GEMINI_API_KEY_1", "test-key-1")
os.environ.setdefault("GEMINI_API_KEY_2", "test-key-2")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

# Now safe to import app
from app.database import Base, get_db
from app.main import app
from app.services.cache_service import initialize_cache

# ---------------------------------------------------------------------------
# In-memory SQLite for tests
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite://"  # pure in-memory

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True, scope="session")
def _create_test_tables():
    from app import models  # noqa: F401 – registers ORM classes
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db_session():
    """Fresh DB session per test, rolled back after."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """TestClient with DB and cache overridden."""
    # Initialize cache silently
    try:
        initialize_cache()
    except Exception:
        pass

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Mock LiteLLM response factory
# ---------------------------------------------------------------------------


def make_mock_response(
    content: str = "Test response",
    prompt_tokens: int = 10,
    completion_tokens: int = 8,
    cache_hit: bool = False,
):
    """Return a MagicMock that looks like a litellm ModelResponse."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = content
    response.usage = MagicMock()
    response.usage.prompt_tokens = prompt_tokens
    response.usage.completion_tokens = completion_tokens
    response._hidden_params = {"cache_hit": cache_hit}
    return response
