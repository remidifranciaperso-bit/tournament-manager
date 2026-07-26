"""Vérification et application des changements d'équipe Platform."""

from __future__ import annotations

import copy
import re
from typing import Any

from api.platform.roster import roster_from_snapshot

_TS_RE = re.compile(r"\(TS(\d+)\)\s*$")


def _parse_classement(value: str) -> int:
    digits = re.sub(r"\D", "", value or "")
    return int(digits) if digits else 0


def _joueur_complet(nom: str, prenom: str) -> str:
    nom = (nom or "").strip().upper()
    prenom = (prenom or "").strip()
    if prenom and nom:
        return f"{prenom} {nom}"
    return nom or prenom


def _nom_court(joueur: str) -> str:
    parts = joueur.strip().split(" ", 1)
    if len(parts) == 1:
        return joueur.strip()
    return f"{parts[0][0].upper()}. {parts[1].upper()}"


def _labels_equipe(j1: str, j2: str, ts: int) -> tuple[str, str]:
    court = f"{_nom_court(j1)} / {_nom_court(j2)} (TS{ts})"
    complet = f"{j1} / {j2} (TS{ts})"
    return court, complet


def _extract_ts(label: str) -> int | None:
    match = _TS_RE.search(label or "")
    return int(match.group(1)) if match else None


def _convocation_hours(snapshot: dict[str, Any]) -> dict[int, str]:
    hours: dict[int, str] = {}
    matches = sorted(
        snapshot.get("matches") or [],
        key=lambda item: (
            int(item.get("jour") or 1),
            str(item.get("heure") or ""),
            int(item.get("ordre_planning") or item.get("ordre") or 0),
        ),
    )
    for match in matches:
        heure = str(match.get("heure") or "")
        if not heure:
            continue
        for label in (match.get("equipe1"), match.get("equipe2")):
            if not isinstance(label, str) or not label or label.startswith("?"):
                continue
            ts = _extract_ts(label)
            if ts is None or ts in hours:
                continue
            hours[ts] = heure
    return hours


def _replace_label(value: str, old_labels: set[str], new_label: str) -> str:
    if value in old_labels:
        return new_label
    return value


def _apply_label_replacement(snapshot: dict[str, Any], old_labels: set[str], new_label: str) -> None:
    for match in snapshot.get("matches") or []:
        match["equipe1"] = _replace_label(str(match.get("equipe1") or ""), old_labels, new_label)
        match["equipe2"] = _replace_label(str(match.get("equipe2") or ""), old_labels, new_label)

    fields = snapshot.get("fields")
    if isinstance(fields, dict):
        for key, value in list(fields.items()):
            if isinstance(value, str) and value in old_labels:
                fields[key] = new_label


def _find_equipe(snapshot: dict[str, Any], team_id: str) -> dict[str, Any] | None:
    ts = int(team_id.rsplit("-", 1)[-1])
    for item in snapshot.get("equipes") or []:
        if int(item.get("ts") or 0) == ts:
            return item
    return None


def apply_team_change(snapshot: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    updated = copy.deepcopy(snapshot)
    mode = payload.get("mode")
    if mode == "partner":
        return _apply_partner_change(updated, payload)
    if mode == "replace":
        return _apply_team_replace(updated, payload)
    raise ValueError("Mode de changement inconnu.")


def _apply_partner_change(snapshot: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    player_id = str(payload.get("player_id") or "")
    replacement = payload.get("replacement") or {}
    slot = "j2" if player_id.endswith("-j2") else "j1"
    team_id = player_id.rsplit("-", 1)[0] if player_id else ""
    equipe = _find_equipe(snapshot, team_id)
    if equipe is None:
        raise ValueError("Joueur introuvable dans le tournoi.")

    ts = int(equipe.get("ts") or 0)
    old_labels = {
        label
        for label in (equipe.get("label_court"), equipe.get("label"))
        if isinstance(label, str) and label
    }

    j1 = str(equipe.get("joueur1") or "")
    j2 = str(equipe.get("joueur2") or "")
    if slot == "j1":
        j1 = _joueur_complet(replacement.get("nom", ""), replacement.get("prenom", ""))
        equipe["classement_j1"] = _parse_classement(str(replacement.get("classement") or ""))
    else:
        j2 = _joueur_complet(replacement.get("nom", ""), replacement.get("prenom", ""))
        equipe["classement_j2"] = _parse_classement(str(replacement.get("classement") or ""))

    equipe["joueur1"] = j1
    equipe["joueur2"] = j2
    equipe["poids"] = int(equipe.get("classement_j1") or 0) + int(equipe.get("classement_j2") or 0)
    label_court, label = _labels_equipe(j1, j2, ts)
    equipe["label_court"] = label_court
    equipe["label"] = label

    _apply_label_replacement(snapshot, old_labels, label_court)
    return snapshot


def _apply_team_replace(snapshot: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    team_id = str(payload.get("team_id") or "")
    replacement = payload.get("replacement") or {}
    equipe = _find_equipe(snapshot, team_id)
    if equipe is None:
        raise ValueError("Équipe introuvable dans le tournoi.")

    ts = int(equipe.get("ts") or 0)
    old_labels = {
        label
        for label in (equipe.get("label_court"), equipe.get("label"))
        if isinstance(label, str) and label
    }

    j1 = _joueur_complet((replacement.get("joueur1") or {}).get("nom", ""), (replacement.get("joueur1") or {}).get("prenom", ""))
    j2 = _joueur_complet((replacement.get("joueur2") or {}).get("nom", ""), (replacement.get("joueur2") or {}).get("prenom", ""))
    c1 = _parse_classement(str((replacement.get("joueur1") or {}).get("classement") or ""))
    c2 = _parse_classement(str((replacement.get("joueur2") or {}).get("classement") or ""))

    equipe["joueur1"] = j1
    equipe["joueur2"] = j2
    equipe["classement_j1"] = c1
    equipe["classement_j2"] = c2
    equipe["poids"] = c1 + c2
    label_court, label = _labels_equipe(j1, j2, ts)
    equipe["label_court"] = label_court
    equipe["label"] = label

    _apply_label_replacement(snapshot, old_labels, label_court)
    return snapshot


def _impact_flags(mode: str, result: str, convocations_changed: int) -> dict[str, bool]:
    if mode == "partner":
        return {
            "ts_modified": False,
            "bracket_modified": False,
            "convocations_modified": result == "blocked" or convocations_changed > 0,
        }
    if mode == "replace":
        needs_adjust = result == "adjust"
        return {
            "ts_modified": needs_adjust,
            "bracket_modified": needs_adjust,
            "convocations_modified": convocations_changed > 0,
        }
    return {
        "ts_modified": False,
        "bracket_modified": False,
        "convocations_modified": False,
    }


def check_team_change(snapshot: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    mode = payload.get("mode")
    if mode == "replace":
        result = "adjust"
        convocations_changed = 0
        impact = _impact_flags(mode, result, convocations_changed)
        return {
            "result": result,
            "message": (
                "Compatible avec ajustement interne du tirage — proposition : permuter "
                "les TS voisins non joués pour respecter le niveau sportif."
            ),
            "convocations_changed": convocations_changed,
            **impact,
        }

    if mode != "partner":
        raise ValueError("Mode de changement inconnu.")

    before = _convocation_hours(snapshot)
    after = _convocation_hours(apply_team_change(copy.deepcopy(snapshot), payload))
    if before == after:
        result = "ok"
        convocations_changed = 0
        impact = _impact_flags(mode, result, convocations_changed)
        return {
            "result": result,
            "message": "Compatible — aucune convocation ne change.",
            "convocations_changed": convocations_changed,
            **impact,
        }

    changed = sum(1 for ts, heure in before.items() if after.get(ts) != heure)
    result = "blocked"
    impact = _impact_flags(mode, result, changed)
    return {
        "result": result,
        "message": (
            f"Incompatible — {changed} convocation(s) seraient décalée(s). "
            "Choisissez un remplaçant avec un créneau équivalent ou remplacez l'équipe entière."
        ),
        "convocations_changed": changed,
        **impact,
    }


def validate_team_change_payload(snapshot: dict[str, Any], payload: dict[str, Any]) -> None:
    roster = roster_from_snapshot(snapshot)
    mode = payload.get("mode")
    if mode == "partner":
        player_id = str(payload.get("player_id") or "")
        if not any(player["id"] == player_id for player in roster["players"]):
            raise ValueError("Sélectionnez un joueur.")
        repl = payload.get("replacement") or {}
        if not str(repl.get("nom") or "").strip() or not str(repl.get("prenom") or "").strip():
            raise ValueError("Renseignez le remplaçant (nom et prénom).")
        return

    if mode == "replace":
        team_id = str(payload.get("team_id") or "")
        if not any(team["id"] == team_id for team in roster["teams"]):
            raise ValueError("Sélectionnez une équipe.")
        repl = payload.get("replacement") or {}
        for slot in ("joueur1", "joueur2"):
            joueur = repl.get(slot) or {}
            if not str(joueur.get("nom") or "").strip() or not str(joueur.get("prenom") or "").strip():
                raise ValueError("Renseignez les deux joueurs remplaçants.")
        return

    raise ValueError("Mode de changement inconnu.")
