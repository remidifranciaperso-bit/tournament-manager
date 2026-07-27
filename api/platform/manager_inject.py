"""Bundle inject Manager Live Platform — copie V2 (sans importer main_v2)."""

from api.platform.live_manager_inject_assets import (
    inject_head_snippet,
    inject_strip_html,
    manager_inject_css,
    manager_inject_js,
)

__all__ = [
    "inject_head_snippet",
    "inject_strip_html",
    "manager_inject_css",
    "manager_inject_js",
]
