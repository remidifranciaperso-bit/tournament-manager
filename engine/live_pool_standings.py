"""Classement de poule — port de ``buildPoolStandings.ts``."""

from __future__ import annotations

from dataclasses import dataclass

from engine.live_pool_layout import pool_matches


@dataclass
class PoolStandingRow:
    team: str
    played: int
    wins: int
    losses: int
    games_for: int
    games_against: int
    game_diff: int
    rank: int


def build_pool_standings(
    matches: list[dict],
    match_results: dict[str, dict],
    *,
    letter: str | None = None,
) -> list[PoolStandingRow]:
    pool = pool_matches(matches, letter) if letter else list(matches)
    stats: dict[str, dict] = {}

    def ensure(team: str) -> dict:
        if team not in stats:
            stats[team] = {
                "team": team,
                "order": len(stats),
                "played": 0,
                "wins": 0,
                "losses": 0,
                "games_for": 0,
                "games_against": 0,
            }
        return stats[team]

    for match in pool:
        team1 = (match.get("equipe1") or "").strip()
        team2 = (match.get("equipe2") or "").strip()
        if not team1 or not team2:
            continue
        s1 = ensure(team1)
        s2 = ensure(team2)
        result = match_results.get(match.get("code", ""))
        if not result:
            continue

        g1 = 0
        g2 = 0
        for set_row in result.get("sets") or []:
            g1 += int(set_row.get("team1") or 0)
            g2 += int(set_row.get("team2") or 0)

        s1["played"] += 1
        s2["played"] += 1
        s1["games_for"] += g1
        s1["games_against"] += g2
        s2["games_for"] += g2
        s2["games_against"] += g1

        winner = result.get("winner")
        if winner == 1:
            s1["wins"] += 1
            s2["losses"] += 1
        elif winner == 2:
            s2["wins"] += 1
            s1["losses"] += 1

    ordered = sorted(
        stats.values(),
        key=lambda s: (
            -s["wins"],
            -(s["games_for"] - s["games_against"]),
            -s["games_for"],
            s["order"],
        ),
    )

    rows: list[PoolStandingRow] = []
    for index, stat in enumerate(ordered):
        diff = stat["games_for"] - stat["games_against"]
        rows.append(
            PoolStandingRow(
                team=stat["team"],
                played=stat["played"],
                wins=stat["wins"],
                losses=stat["losses"],
                games_for=stat["games_for"],
                games_against=stat["games_against"],
                game_diff=diff,
                rank=index + 1,
            )
        )
    return rows
