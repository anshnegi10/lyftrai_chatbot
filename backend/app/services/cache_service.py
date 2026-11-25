from __future__ import annotations

"""Cache service – thin wrapper that sets up LiteLLM's built-in in-memory cache."""

import logging

import litellm

logger = logging.getLogger(__name__)

_cache_enabled = False


def initialize_cache() -> None:
    """Call at application startup to enable LiteLLM InMemoryCache."""
    global _cache_enabled
    try:
        from litellm.caching.caching import Cache  # litellm >= 1.44

        litellm.cache = Cache(type="local")
        litellm.enable_cache()
        _cache_enabled = True
        logger.info("LiteLLM in-memory cache initialised.")
    except Exception as exc:  # pragma: no cover
        logger.warning("Could not initialise LiteLLM cache: %s", exc)
        _cache_enabled = False


def is_cache_enabled() -> bool:
    return _cache_enabled
