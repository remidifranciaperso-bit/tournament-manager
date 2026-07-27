"""Bundle inject Manager Live (copie read-only depuis main_v2, sans modifier Engine V2)."""

from __future__ import annotations

from functools import lru_cache


@lru_cache(maxsize=1)
def _assets():
    from api.main_v2 import (
        _LIVE_MANAGER_INJECT_CSS,
        _LIVE_MANAGER_INJECT_HEAD_SNIPPET,
        _LIVE_MANAGER_INJECT_JS,
        _strip_live_manager_inject,
    )

    return (
        _LIVE_MANAGER_INJECT_CSS,
        _LIVE_MANAGER_INJECT_JS,
        _LIVE_MANAGER_INJECT_HEAD_SNIPPET,
        _strip_live_manager_inject,
    )


def manager_inject_css() -> str:
    return _assets()[0]


def manager_inject_js() -> str:
    return _assets()[1]


def inject_head_snippet() -> str:
    return _assets()[2]


def inject_strip_html(html: str) -> str:
    return _assets()[3](html)
