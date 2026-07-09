"""Analyse layout.json pour les slides bracket (port simplifié du frontend)."""

from __future__ import annotations

import re

META_KEYS = {
    "TYPE",
    "DATE",
    "HEURE",
    "LOGO",
    "CLUB",
    "PARTICIPANTS",
    "NB_EQUIPES",
    "NB_TERRAINS",
    "CONV_NOMS",
    "CONV_HORAIRE",
}

MATCH_PART_RE = re.compile(
    r"^(?P<code>[A-Z][A-Z0-9_]*?)_(?P<part>CODE|HEURE|TERRAIN|EQ1|EQ2)$"
)
FEED_RE = re.compile(r"^(WIN|LOSE|SECOND|THIRD)_(.+)$")


def _is_renderable_match_code(code: str) -> bool:
    if code in META_KEYS:
        return False
    if code.startswith(("PL", "PTS", "POULE", "EXEMPT")):
        return False
    if code.startswith(("PA_", "PB_", "PC_", "PD_")):
        return False
    return True


def _union_rect(fields: list[dict]) -> dict:
    left = min(field["left"] for field in fields)
    top = min(field["top"] for field in fields)
    right = max(field["left"] + field["width"] for field in fields)
    bottom = max(field["top"] + field["height"] for field in fields)
    return {
        "left": left,
        "top": top,
        "width": right - left,
        "height": bottom - top,
    }


def parse_bracket_slide(fields: list[dict]) -> dict:
    match_parts: dict[str, dict[str, dict]] = {}
    feeds: list[dict] = []

    for field in fields:
        key = field["key"]
        feed_match = FEED_RE.match(key)
        if feed_match:
            feeds.append(field)
            continue

        part_match = MATCH_PART_RE.match(key)
        if not part_match:
            continue

        code = part_match.group("code")
        part = part_match.group("part")
        if not _is_renderable_match_code(code):
            continue

        bucket = match_parts.setdefault(code, {})
        bucket[part] = field

    matches = []
    for code, parts in match_parts.items():
        part_fields = [value for value in parts.values() if value]
        if not part_fields:
            continue

        matches.append(
            {
                "code": code,
                "bounds": _union_rect(part_fields),
                "code_field": parts.get("CODE"),
                "heure_field": parts.get("HEURE"),
                "terrain_field": parts.get("TERRAIN"),
                "eq1_field": parts.get("EQ1"),
                "eq2_field": parts.get("EQ2"),
            }
        )

    matches.sort(
        key=lambda item: (item["bounds"]["top"], item["bounds"]["left"])
    )

    return {"matches": matches, "feeds": feeds}
