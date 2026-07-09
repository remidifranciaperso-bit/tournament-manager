"""Résolution des libellés d'équipes (Vainqueur/Perdant) pour l'export PDF."""

from __future__ import annotations

import re

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


def format_team_slot(label: str) -> str:
    text = label.strip()
    if not text:
        return "—"

    if text.startswith("Vainqueur Poule "):
        return f"1er {text.replace('Vainqueur ', '')}:"
    if text.startswith(("Deuxième Poule ", "Second Poule ")):
        return f"2e {re.sub(r'^(Deuxième|Second) ', '', text)}:"
    if text.startswith("Troisième Poule "):
        return f"3 {text.replace('Troisième ', '')}:"
    if text.startswith("Vainqueur "):
        return f"{ICONE_VAINQUEUR}{text.replace('Vainqueur ', '')}:"
    if text.startswith("Perdant "):
        return f"{ICONE_PERDANT}{text.replace('Perdant ', '')}:"

    return text


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


def format_team_display(
    label: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> str:
    resolved = resolve_team_label_deep(label, matches_by_code, match_results)
    text = resolved if resolved != label.strip() else format_team_slot(label)
    return text.replace("\n", " / ")


def is_placeholder(text: str) -> bool:
    return text.startswith(ICONE_VAINQUEUR) or text.startswith(ICONE_PERDANT)
