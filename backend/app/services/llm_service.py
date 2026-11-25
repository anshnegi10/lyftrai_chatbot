from __future__ import annotations

"""LLM service: multi-key failover via manual retry loop using litellm.acompletion."""

import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

import litellm
from litellm.exceptions import (
    AuthenticationError,
    BadRequestError,
    RateLimitError,
    ServiceUnavailableError,
)

from app.config import settings

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini/gemini-2.0-flash"

# ---------------------------------------------------------------------------
# Retryable HTTP status codes
# ---------------------------------------------------------------------------
RETRYABLE_STATUS_CODES = {429, 500, 502, 503}


class AllProvidersFailedError(Exception):
    """Raised when every configured API key has failed."""


# ---------------------------------------------------------------------------
# Failure simulation helpers
# ---------------------------------------------------------------------------


def parse_simulate_header(header_value: str) -> Dict[str, int]:
    """
    Parse X-Simulate-Failure header.

    Examples:
        "key_1=429"             -> {"key_1": 429}
        "key_1=500,key_2=503"   -> {"key_1": 500, "key_2": 503}
        "*=429"                 -> {"*": 429}
    """
    result: Dict[str, int] = {}
    if not header_value:
        return result
    for part in header_value.split(","):
        part = part.strip()
        if "=" in part:
            key, _, code = part.partition("=")
            try:
                result[key.strip()] = int(code.strip())
            except ValueError:
                pass
    return result


def _make_simulated_exception(status_code: int, key_id: str) -> Exception:
    message = f"Simulated {status_code} failure for {key_id}"
    if status_code == 429:
        return RateLimitError(message=message, model=MODEL_NAME, llm_provider="google")
    if status_code in (500, 502):
        return litellm.InternalServerError(
            message=message, model=MODEL_NAME, llm_provider="google", status_code=status_code
        )
    if status_code == 503:
        return ServiceUnavailableError(
            message=message, model=MODEL_NAME, llm_provider="google"
        )
    return Exception(message)


def _should_simulate(key_id: str, simulate_map: Dict[str, int]) -> Optional[int]:
    """Return the status code to simulate for key_id, or None."""
    if "*" in simulate_map:
        return simulate_map["*"]
    return simulate_map.get(key_id)


def _is_retryable(exc: Exception) -> bool:
    """Return True if the error should trigger failover to the next key."""
    if isinstance(exc, (RateLimitError, ServiceUnavailableError)):
        return True
    # Check for InternalServerError / generic errors with status codes
    status_code = getattr(exc, "status_code", None)
    if status_code and status_code in RETRYABLE_STATUS_CODES:
        return True
    # AuthenticationError is NOT retryable in normal flow, but we let it fall through
    return False


# ---------------------------------------------------------------------------
# Main failover function
# ---------------------------------------------------------------------------


async def call_with_failover(
    messages: List[Dict[str, Any]],
    simulate_failures: Optional[Dict[str, int]] = None,
) -> Tuple[Any, str, int]:
    """
    Try key_1, then key_2 on retryable failures.

    Returns:
        (litellm_response, key_id_used, fallback_attempts)

    Raises:
        AllProvidersFailedError if all keys exhausted.
    """
    keys = [
        {"key_id": "key_1", "api_key": settings.GEMINI_API_KEY_1},
        {"key_id": "key_2", "api_key": settings.GEMINI_API_KEY_2},
    ]

    fallback_attempts = 0
    last_error: Optional[Exception] = None
    is_first_key = True

    for key_info in keys:
        key_id = key_info["key_id"]
        api_key = key_info["api_key"]

        if not is_first_key:
            fallback_attempts += 1
        is_first_key = False

        # ---- Failure simulation ----
        if simulate_failures:
            code = _should_simulate(key_id, simulate_failures)
            if code is not None:
                logger.info("Simulating %d failure for %s", code, key_id)
                last_error = _make_simulated_exception(code, key_id)
                continue  # Skip real call, try next key

        # ---- Real API call ----
        try:
            response = await litellm.acompletion(
                model=MODEL_NAME,
                messages=messages,
                api_key=api_key,
                caching=True,
            )
            return response, key_id, fallback_attempts
        except Exception as exc:
            if _is_retryable(exc):
                logger.warning("Key %s failed with retryable error: %s", key_id, exc)
                last_error = exc
                continue
            # Non-retryable: re-raise immediately
            raise

    raise AllProvidersFailedError(
        f"All providers unavailable. Last error: {last_error}"
    ) from last_error
