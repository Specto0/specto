import asyncio
import time
from typing import Any, Dict, Tuple

import httpx

DEFAULT_TTL = 300.0  # 5 minutos

_client = httpx.AsyncClient(timeout=8.0)
_cache_lock = asyncio.Lock()
_cache: Dict[str, Tuple[float, Any]] = {}


async def cached_get_json(url: str, ttl: float = DEFAULT_TTL) -> Any:
    """Efetua um GET com cache simples em memória."""
    now = time.monotonic()
    async with _cache_lock:
        item = _cache.get(url)
        if item and item[0] > now:
            return item[1]

    response = await _client.get(url)
    response.raise_for_status()
    data = response.json()

    async with _cache_lock:
        _cache[url] = (now + ttl, data)

    return data


async def close_cache_client() -> None:
    await _client.aclose()
