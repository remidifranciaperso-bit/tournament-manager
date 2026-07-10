"""Libellés de places en jeu (ex. 1-2, 5-6) depuis le champ tour."""

from __future__ import annotations

import re

_CLASSEMENT_RE = re.compile(r"classement\s+(\d+)\s*-\s*(\d+)", re.IGNORECASE)


def match_placement_label(tour: str) -> str | None:
    normalized = tour.strip().lower()

    if normalized == "finale":
        return "1-2"
    if normalized == "petite finale":
        return "3-4"

    match = _CLASSEMENT_RE.search(tour)
    if not match:
        return None

    winner_place = int(match.group(1))
    loser_place = int(match.group(2))

    if loser_place - winner_place != 1:
        return None

    return f"{winner_place}-{loser_place}"


def parse_placement_tour(
    tour: str,
) -> dict[str, int] | None:
    label = match_placement_label(tour)
    if not label:
        return None

    winner_place, loser_place = (int(value) for value in label.split("-"))
    return {"winnerPlace": winner_place, "loserPlace": loser_place}
