"""Classement final dynamique pour l'export PDF."""

from __future__ import annotations

import re

from engine.live_team_resolve import resolve_team_label_deep
from engine.match_placement_label import parse_placement_tour

VAINQUEUR_RE = re.compile(r"^(Vainqueur|Perdant)\s+", re.IGNORECASE)


def _matches_by_code(matches: list[dict]) -> dict[str, dict]:
    return {match["code"]: match for match in matches}


def _format_team_name(
    label: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> str:
    resolved = resolve_team_label_deep(label, matches_by_code, match_results).strip()
    if not resolved or VAINQUEUR_RE.match(resolved):
        return ""
    return resolved


def build_final_ranking(
    matches: list[dict],
    match_results: dict[str, dict],
    fields: dict[str, str],
    nb_equipes: int,
) -> list[dict]:
    matches_by_code = _matches_by_code(matches)
    teams_by_place: dict[int, str] = {}

    for match in matches:
        placement = parse_placement_tour(match.get("tour", ""))
        result = match_results.get(match["code"])
        if not placement or not result:
            continue

        winner_raw = match.get("equipe1") if result.get("winner") == 1 else match.get("equipe2")
        loser_raw = match.get("equipe1") if result.get("loser") == 1 else match.get("equipe2")

        winner = _format_team_name(winner_raw or "", matches_by_code, match_results)
        loser = _format_team_name(loser_raw or "", matches_by_code, match_results)

        if winner:
            teams_by_place[placement["winnerPlace"]] = winner
        if loser:
            teams_by_place[placement["loserPlace"]] = loser

    rows = []
    for place in range(1, nb_equipes + 1):
        rows.append(
            {
                "place": place,
                "team": teams_by_place.get(place, ""),
                "points": fields.get(f"PTS{place}", "").strip(),
            }
        )
    return rows


def format_place_label(place: int) -> str:
    if place == 1:
        return "1 🥇"
    if place == 2:
        return "2 🥈"
    if place == 3:
        return "3 🥉"
    return str(place)
