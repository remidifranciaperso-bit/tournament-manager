"""Proxy des routes Manager Live vers Engine V2 (build Platform, sans modifier Engine V2)."""

from __future__ import annotations

import httpx
from fastapi import Request, Response

from api.platform.config import ENGINE_V2_URL

_LIVE_PROXY_METHODS = ["GET", "POST", "HEAD", "OPTIONS"]
_HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "content-encoding",
        "content-length",
    }
)


async def proxy_live_request(path: str, request: Request) -> Response:
    base = ENGINE_V2_URL.rstrip("/")
    target = f"{base}/api/live/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection"}
    }
    headers["Accept-Encoding"] = "identity"

    body = await request.body()
    timeout = httpx.Timeout(300.0, connect=90.0)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        upstream = await client.request(
            request.method,
            target,
            headers=headers,
            content=body if body else None,
        )

    response_headers = {
        key: value for key, value in upstream.headers.items() if key.lower() not in _HOP_BY_HOP
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
