"""Vérification et application des changements d'équipe Platform."""

from __future__ import annotations

import copy
import re
from itertools import groupby, permutations, product
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


def _team_identity(equipe: dict[str, Any]) -> tuple[str, str]:
    return (str(equipe.get("joueur1") or ""), str(equipe.get("joueur2") or ""))


def _team_ts_map(snapshot: dict[str, Any]) -> dict[tuple[str, str], int]:
    return {_team_identity(equipe): int(equipe.get("ts") or 0) for equipe in snapshot.get("equipes") or []}


def _team_convocation_changes(before: dict[str, Any], after: dict[str, Any]) -> int:
    hours = _convocation_hours(before)
    before_ts = _team_ts_map(before)
    after_ts = _team_ts_map(after)
    changed = 0
    for identity, old_ts in before_ts.items():
        new_ts = after_ts.get(identity)
        if new_ts is None:
            continue
        if hours.get(old_ts) != hours.get(new_ts):
            changed += 1
    return changed


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


def _apply_label_map(snapshot: dict[str, Any], label_map: dict[str, str]) -> None:
    if not label_map:
        return
    for match in snapshot.get("matches") or []:
        for key in ("equipe1", "equipe2"):
            value = str(match.get(key) or "")
            if value in label_map:
                match[key] = label_map[value]

    fields = snapshot.get("fields")
    if isinstance(fields, dict):
        for key, value in list(fields.items()):
            if isinstance(value, str) and value in label_map:
                fields[key] = label_map[value]


def _team_ts_signature(snapshot: dict[str, Any]) -> dict[tuple[str, str], int]:
    return _team_ts_map(snapshot)


def _sportif_valid(ts_by_team: dict[tuple[str, str], int], poids_by_team: dict[tuple[str, str], int]) -> bool:
    ordered = sorted(
        ((ts, poids_by_team[identity]) for identity, ts in ts_by_team.items()),
        key=lambda item: item[0],
    )
    poids_values = [item[1] for item in ordered]
    return poids_values == sorted(poids_values)


def _convocation_cost(
    ts_by_team: dict[tuple[str, str], int],
    candidate: dict[tuple[str, str], int],
    hours_by_ts: dict[int, str],
) -> int:
    cost = 0
    for identity, old_ts in ts_by_team.items():
        new_ts = candidate.get(identity, old_ts)
        if hours_by_ts.get(old_ts) != hours_by_ts.get(new_ts):
            cost += 1
    return cost


def _build_sportif_assignments(teams: list[dict[str, Any]]) -> list[dict[tuple[str, str], int]]:
    """Toutes les assignations TS sportives (poids non décroissants par TS)."""
    if not teams:
        return []

    ranked = sorted(
        teams,
        key=lambda equipe: (int(equipe.get("poids") or 999_999), int(equipe.get("ts") or 0)),
    )
    groups = [list(group) for _, group in groupby(ranked, key=lambda equipe: int(equipe.get("poids") or 999_999))]

    slot_options: list[list[list[tuple[tuple[str, str], int]]]] = []
    slot = 1
    for group in groups:
        slots = list(range(slot, slot + len(group)))
        slot += len(group)
        identities = [_team_identity(equipe) for equipe in group]
        if len(identities) == 1:
            slot_options.append([[(identities[0], slots[0])]])
        else:
            perms: list[list[tuple[tuple[str, str], int]]] = []
            for perm in permutations(slots):
                perms.append(list(zip(identities, perm, strict=True)))
            slot_options.append(perms)

    assignments: list[dict[tuple[str, str], int]] = []
    for combo in product(*slot_options):
        assignment: dict[tuple[str, str], int] = {}
        for group_pairs in combo:
            for identity, ts in group_pairs:
                assignment[identity] = ts
        assignments.append(assignment)
    return assignments


def _rank_slot_range(equipe: dict[str, Any], teams: list[dict[str, Any]]) -> list[int]:
    poids = int(equipe.get("poids") or 999_999)
    ranked = sorted(
        teams,
        key=lambda item: (int(item.get("poids") or 999_999), int(item.get("ts") or 0)),
    )
    same = [item for item in ranked if int(item.get("poids") or 999_999) == poids]
    first = ranked.index(same[0]) + 1
    return list(range(first, first + len(same)))


def _build_assignments_on_slots(
    teams: list[dict[str, Any]],
    slots: list[int],
) -> list[dict[tuple[str, str], int]]:
    if len(teams) != len(slots):
        return []
    ranked = sorted(
        teams,
        key=lambda equipe: (int(equipe.get("poids") or 999_999), int(equipe.get("ts") or 0)),
    )
    ordered_slots = sorted(slots)
    groups = [list(group) for _, group in groupby(ranked, key=lambda equipe: int(equipe.get("poids") or 999_999))]

    slot_options: list[list[list[tuple[tuple[str, str], int]]]] = []
    cursor = 0
    for group in groups:
        group_slots = ordered_slots[cursor : cursor + len(group)]
        cursor += len(group)
        identities = [_team_identity(equipe) for equipe in group]
        if len(identities) == 1:
            slot_options.append([[(identities[0], group_slots[0])]])
        else:
            perms: list[list[tuple[tuple[str, str], int]]] = []
            for perm in permutations(group_slots):
                perms.append(list(zip(identities, perm, strict=True)))
            slot_options.append(perms)

    assignments: list[dict[tuple[str, str], int]] = []
    for combo in product(*slot_options):
        assignment: dict[tuple[str, str], int] = {}
        for group_pairs in combo:
            for identity, ts in group_pairs:
                assignment[identity] = ts
        assignments.append(assignment)
    return assignments


def _build_assignments_with_focus(
    teams: list[dict[str, Any]],
    focus_identity: tuple[str, str],
) -> list[dict[tuple[str, str], int]]:
    focus_equipe = next((equipe for equipe in teams if _team_identity(equipe) == focus_identity), None)
    if focus_equipe is None:
        return []

    others = [equipe for equipe in teams if _team_identity(equipe) != focus_identity]
    assignments: list[dict[tuple[str, str], int]] = []
    for focus_ts in _rank_slot_range(focus_equipe, teams):
        free_slots = [slot for slot in range(1, len(teams) + 1) if slot != focus_ts]
        for other_assignment in _build_assignments_on_slots(others, free_slots):
            assignments.append({focus_identity: focus_ts, **other_assignment})
    return assignments


def _swap_candidates(current: dict[tuple[str, str], int]) -> list[dict[tuple[str, str], int]]:
    identities = list(current.keys())
    candidates = [dict(current)]
    for index_a, id_a in enumerate(identities):
        for id_b in identities[index_a + 1 :]:
            swapped = dict(current)
            swapped[id_a], swapped[id_b] = swapped[id_b], swapped[id_a]
            candidates.append(swapped)
    return candidates


def _collect_assignment_candidates(
    teams: list[dict[str, Any]],
    current_ts: dict[tuple[str, str], int],
    *,
    focus_identity: tuple[str, str] | None = None,
) -> list[dict[tuple[str, str], int]]:
    seen: set[frozenset[tuple[tuple[str, str], int]]] = set()
    candidates: list[dict[tuple[str, str], int]] = []

    def add(candidate: dict[tuple[str, str], int]) -> None:
        key = frozenset(candidate.items())
        if key in seen:
            return
        seen.add(key)
        candidates.append(candidate)

    add(dict(current_ts))
    for candidate in _swap_candidates(current_ts):
        add(candidate)
    for candidate in _build_sportif_assignments(teams):
        add(candidate)
    if focus_identity is not None:
        for candidate in _build_assignments_with_focus(teams, focus_identity):
            add(candidate)
    return candidates


def _apply_ts_assignment(snapshot: dict[str, Any], assignment: dict[tuple[str, str], int]) -> bool:
    equipes = snapshot.get("equipes")
    if not isinstance(equipes, list):
        return False

    label_map: dict[str, str] = {}
    ts_changed = False

    for equipe in equipes:
        identity = _team_identity(equipe)
        new_ts = int(assignment.get(identity, equipe.get("ts") or 0))
        old_ts = int(equipe.get("ts") or 0)
        old_court = str(equipe.get("label_court") or "")
        old_label = str(equipe.get("label") or "")

        if old_ts != new_ts:
            ts_changed = True

        j1 = str(equipe.get("joueur1") or "")
        j2 = str(equipe.get("joueur2") or "")
        label_court, label = _labels_equipe(j1, j2, new_ts)
        equipe["ts"] = new_ts
        equipe["numero"] = new_ts
        equipe["label_court"] = label_court
        equipe["label"] = label

        if old_court:
            label_map[old_court] = label_court
        if old_label:
            label_map[old_label] = label

    _apply_label_map(snapshot, label_map)
    return ts_changed


def _optimize_ts_assignment(
    snapshot: dict[str, Any],
    *,
    focus_identity: tuple[str, str] | None = None,
) -> bool:
    equipes = snapshot.get("equipes")
    if not isinstance(equipes, list) or len(equipes) < 2:
        return False

    hours_by_ts = _convocation_hours(snapshot)
    current_ts = _team_ts_map(snapshot)
    poids_by_team = {_team_identity(equipe): int(equipe.get("poids") or 999_999) for equipe in equipes}

    best: dict[tuple[str, str], int] | None = None
    best_cost = 10**9
    for candidate in _collect_assignment_candidates(
        equipes,
        current_ts,
        focus_identity=focus_identity,
    ):
        if not _sportif_valid(candidate, poids_by_team):
            continue
        cost = _convocation_cost(current_ts, candidate, hours_by_ts)
        if cost < best_cost:
            best = candidate
            best_cost = cost

    if best is None:
        return False
    return _apply_ts_assignment(snapshot, best)


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
    _optimize_ts_assignment(snapshot, focus_identity=_team_identity(equipe))
    return snapshot


def _impact_flags(
    mode: str,
    result: str,
    convocations_changed: int,
    *,
    ts_modified: bool = False,
    bracket_modified: bool = False,
) -> dict[str, bool]:
    if mode == "partner":
        return {
            "ts_modified": False,
            "bracket_modified": False,
            "convocations_modified": result == "blocked" or convocations_changed > 0,
        }
    if mode == "replace":
        return {
            "ts_modified": ts_modified,
            "bracket_modified": bracket_modified,
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
        before = copy.deepcopy(snapshot)
        after = apply_team_change(copy.deepcopy(snapshot), payload)
        ts_modified = _team_ts_signature(before) != _team_ts_signature(after)
        bracket_modified = ts_modified
        convocations_changed = _team_convocation_changes(before, after)

        if ts_modified:
            result = "adjust"
            if convocations_changed > 0:
                message = (
                    f"Compatible avec ajustement du tirage — {convocations_changed} convocation(s) "
                    "modifiée(s) (solution la plus proche du classement sportif testée)."
                )
            else:
                message = (
                    "Compatible avec ajustement interne du tirage — le classement TS est corrigé "
                    "sans modifier les convocations."
                )
        else:
            result = "ok"
            message = "Compatible — le classement TS reste inchangé."

        impact = _impact_flags(
            mode,
            result,
            convocations_changed,
            ts_modified=ts_modified,
            bracket_modified=bracket_modified,
        )
        return {
            "result": result,
            "message": message,
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
