"""Métadonnées poules — aligné sur ``buildPoolStandings.ts`` / LivePoolsTab."""

from __future__ import annotations

import json
import re
from pathlib import Path

_POOL_FIELD_RE = re.compile(r"^P([A-D])_M\d+_")
_POULE_ROSTER_RE = re.compile(r"^POULE_[A-Z]_\d+_EQ$")
_POOL_CODE_RE = re.compile(r"^P([A-Z])_M(\d+)$")


def charger_layout_template(template_id: str, base_dir: Path) -> dict:
    for root in (
        base_dir / "frontend" / "public" / "live-templates",
        base_dir / "frontend" / "dist" / "live-templates",
    ):
        path = root / template_id / "layout.json"
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Layout introuvable pour {template_id}")


def pool_letter_from_code(code: str) -> str | None:
    match = _POOL_CODE_RE.match(code or "")
    return match.group(1) if match else None


def pool_match_number(code: str) -> int:
    match = _POOL_CODE_RE.match(code or "")
    return int(match.group(2)) if match else 0


def pool_matches(matches: list[dict], letter: str) -> list[dict]:
    letter = letter.upper()
    filtered = [m for m in matches if pool_letter_from_code(m.get("code", "")) == letter]
    return sorted(filtered, key=lambda m: pool_match_number(m.get("code", "")))


def pool_letters(matches: list[dict]) -> list[str]:
    letters = {pool_letter_from_code(m.get("code", "")) for m in matches}
    letters.discard(None)
    return sorted(letters)


def pool_slide_letters_from_layout(layout: dict) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for key, slide_fields in layout.items():
        try:
            slide_index = int(key)
        except ValueError:
            continue
        for field in slide_fields:
            match = _POOL_FIELD_RE.match(field.get("key", ""))
            if match:
                mapping[slide_index] = match.group(1)
                break
    return mapping


def composition_slide_index_from_layout(layout: dict) -> int | None:
    for key, slide_fields in layout.items():
        if any(_POULE_ROSTER_RE.match(f.get("key", "")) for f in slide_fields):
            try:
                return int(key)
            except ValueError:
                continue
    return None


def pool_roster(matches: list[dict], letter: str) -> list[str]:
    roster: list[str] = []
    for match in pool_matches(matches, letter):
        for team in (match.get("equipe1"), match.get("equipe2")):
            name = (team or "").strip()
            if name and name not in roster:
                roster.append(name)
    return roster


def exempt_teams(fields: dict[str, str]) -> list[str]:
    teams: list[str] = []
    for index in range(1, 33):
        key = f"EXEMPT_{index}_EQ"
        if key not in fields:
            if index > 1:
                break
            continue
        value = (fields.get(key) or "").strip()
        if value:
            teams.append(value)
    return teams


def pool_header_title(letter: str) -> str:
    return f"POULE {letter.upper()}"
