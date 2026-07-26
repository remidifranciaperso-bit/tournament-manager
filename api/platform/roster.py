"""Effectif tournoi Platform — lecture depuis le snapshot Live."""

from __future__ import annotations

import re
from typing import Any

_TS_RE = re.compile(r"\(TS(\d+)\)\s*$")


def _joueur_label(prenom: str, nom: str, ts: int) -> str:
    prenom = prenom.strip()
    nom = nom.strip().upper()
    if prenom and nom:
        return f"{prenom} {nom} (TS{ts})"
    return f"{nom or prenom} (TS{ts})"


def _parse_ts(label: str) -> int | None:
    match = _TS_RE.search(label or "")
    if not match:
        return None
    return int(match.group(1))


def roster_from_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    teams: list[dict[str, Any]] = []
    players: list[dict[str, Any]] = []

    raw_equipes = snapshot.get("equipes")
    if isinstance(raw_equipes, list) and raw_equipes:
        for item in raw_equipes:
            ts = int(item.get("ts") or item.get("numero") or 0)
            team_id = f"team-{ts}"
            j1 = str(item.get("joueur1") or "")
            j2 = str(item.get("joueur2") or "")
            nom_j1, prenom_j1 = _split_joueur(j1)
            nom_j2, prenom_j2 = _split_joueur(j2)
            label = item.get("label_court") or item.get("label") or f"{j1} / {j2} (TS{ts})"
            teams.append(
                {
                    "id": team_id,
                    "ts": ts,
                    "label": label,
                    "joueur1": {
                        "nom": nom_j1,
                        "prenom": prenom_j1,
                        "classement": str(item.get("classement_j1") or ""),
                    },
                    "joueur2": {
                        "nom": nom_j2,
                        "prenom": prenom_j2,
                        "classement": str(item.get("classement_j2") or ""),
                    },
                }
            )
            players.append(
                {
                    "id": f"{team_id}-j1",
                    "team_id": team_id,
                    "slot": "j1",
                    "label": _joueur_label(prenom_j1, nom_j1, ts),
                    **teams[-1]["joueur1"],
                }
            )
            players.append(
                {
                    "id": f"{team_id}-j2",
                    "team_id": team_id,
                    "slot": "j2",
                    "label": _joueur_label(prenom_j2, nom_j2, ts),
                    **teams[-1]["joueur2"],
                }
            )
        return {"teams": teams, "players": players}

    seen: dict[int, str] = {}
    for match in snapshot.get("matches") or []:
        for label in (match.get("equipe1"), match.get("equipe2")):
            if not isinstance(label, str) or not label or label.startswith("?"):
                continue
            ts = _parse_ts(label)
            if ts is None or ts in seen:
                continue
            seen[ts] = label
            team_id = f"team-{ts}"
            teams.append({"id": team_id, "ts": ts, "label": label, "joueur1": {}, "joueur2": {}})
    return {"teams": teams, "players": players}


def _split_joueur(value: str) -> tuple[str, str]:
    parts = value.strip().split(" ", 1)
    if len(parts) == 1:
        return parts[0].upper(), ""
    return parts[1].upper(), parts[0]
