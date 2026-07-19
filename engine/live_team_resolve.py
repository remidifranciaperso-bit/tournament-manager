"""Résolution des libellés d'équipes (Vainqueur/Perdant) pour l'export PDF."""

from __future__ import annotations

import re

from engine.ppt_engine import equipe_label_court

WIN_RE = re.compile(r"^Vainqueur\s+(.+)$", re.IGNORECASE)
LOSE_RE = re.compile(r"^Perdant\s+(.+)$", re.IGNORECASE)

ICONE_VAINQUEUR = "🏆 "
ICONE_PERDANT = "❌ "


def _matches_by_code(matches: list[dict]) -> dict[str, dict]:
    return {match["code"]: match for match in matches}


def resolve_team_label(
    label: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> str:
    text = label.strip()
    if not text:
        return label

    role = None
    parent_code = None

    win = WIN_RE.match(text)
    lose = LOSE_RE.match(text)

    if win:
        role = "winner"
        parent_code = win.group(1).strip()
    elif lose:
        role = "loser"
        parent_code = lose.group(1).strip()
    else:
        return label

    if not parent_code:
        return label

    parent = matches_by_code.get(parent_code)
    result = match_results.get(parent_code)
    if not parent or not result:
        return label

    side = result.get("winner") if role == "winner" else result.get("loser")
    resolved = (
        parent.get("equipe1", "").strip()
        if side == 1
        else parent.get("equipe2", "").strip()
    )
    return resolved or label


def resolve_team_label_deep(
    label: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
    depth: int = 0,
) -> str:
    if depth > 8:
        return label
    resolved = resolve_team_label(label, matches_by_code, match_results)
    if resolved == label:
        return label
    return resolve_team_label_deep(resolved, matches_by_code, match_results, depth + 1)


def feed_key_from_team_label(label: str) -> str | None:
    text = label.strip()
    win = WIN_RE.match(text)
    if win:
        return f"WIN_{win.group(1).strip()}"
    lose = LOSE_RE.match(text)
    if lose:
        return f"LOSE_{lose.group(1).strip()}"
    return None


def format_team_slot(label: str) -> str:
    """Comme ``equipe_label_court`` (Engine V1 / PPTX) — 🏆 H3: / ❌ D1:."""
    if not isinstance(label, str):
        return equipe_label_court(label)

    text = label.strip()
    if not text:
        return "—"

    if text.startswith(ICONE_VAINQUEUR):
        body = text[len(ICONE_VAINQUEUR) :].strip().rstrip(":")
        return f"{ICONE_VAINQUEUR}{body}:" if body else f"{ICONE_VAINQUEUR}:"
    if text.startswith(ICONE_PERDANT):
        body = text[len(ICONE_PERDANT) :].strip().rstrip(":")
        return f"{ICONE_PERDANT}{body}:" if body else f"{ICONE_PERDANT}:"

    return equipe_label_court(text)


def format_feed_key(key: str) -> str:
    if key.startswith("WIN_"):
        return f"{ICONE_VAINQUEUR}{key[4:]}:"
    if key.startswith("LOSE_"):
        return f"{ICONE_PERDANT}{key[5:]}:"
    if key.startswith("SECOND_"):
        return f"2e {key[7]}:"
    if key.startswith("THIRD_"):
        return f"3 {key[6]}:"
    return key


def _short_player_name(name: str) -> str:
    trimmed = name.strip()
    if not trimmed:
        return trimmed
    space_idx = trimmed.find(" ")
    if space_idx == -1:
        return trimmed
    prenom = trimmed[:space_idx]
    nom = trimmed[space_idx + 1 :].strip()
    initial = prenom[0].upper() if prenom else ""
    return f"{initial}. {nom}" if initial else nom


_PLACEHOLDER_PREFIX = re.compile(
    r"^(Vainqueur|Perdant|Deuxième|Second|Troisième|🏆|❌|🥇|🥈|🥉|1er|2e|3 )",
    re.IGNORECASE,
)


def _is_unresolved_placeholder(label: str) -> bool:
    text = label.strip()
    return bool(
        WIN_RE.match(text)
        or LOSE_RE.match(text)
        or _PLACEHOLDER_PREFIX.match(text)
    )


def format_team_with_initials(label: str) -> str:
    text = label.strip()
    if not text:
        return "—"
    if _PLACEHOLDER_PREFIX.match(text):
        return format_team_slot(text)

    seed = ""
    body = text
    seed_match = re.search(r"(\(TS\d*\))\s*$", text, re.IGNORECASE)
    if seed_match:
        seed = f" {seed_match.group(1)}"
        body = text[: seed_match.start()].strip()

    parts = [part.strip() for part in body.split("/") if part.strip()]
    if len(parts) >= 2:
        return f"{' / '.join(_short_player_name(part) for part in parts)}{seed}"
    return f"{_short_player_name(body)}{seed}"


def format_team_display(
    label: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> str:
    raw = label.strip() if isinstance(label, str) else ""
    if not raw:
        return "—"
    if _is_unresolved_placeholder(raw):
        return format_team_slot(raw)

    resolved = resolve_team_label_deep(label, matches_by_code, match_results)
    if (
        resolved != raw
        and resolved.strip()
        and not _is_unresolved_placeholder(resolved)
    ):
        return format_team_with_initials(resolved.replace("\n", " / "))
    if _is_unresolved_placeholder(raw):
        return format_team_slot(raw)
    return format_team_with_initials(raw.replace("\n", " / "))


def is_placeholder(text: str) -> bool:
    return bool(_PLACEHOLDER_PREFIX.match((text or "").strip()))
