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


def _pair_changed_identities(
    old_id: tuple[str, str],
    added: set[tuple[str, str]],
    paired_added: set[tuple[str, str]],
) -> tuple[str, str] | None:
    for new_id in added:
        if new_id in paired_added:
            continue
        if old_id[0] in new_id or old_id[1] in new_id:
            return new_id
    if len(added) - len(paired_added) == 1:
        remaining = [item for item in added if item not in paired_added]
        if remaining:
            return remaining[0]
    return None


def _team_convocation_changes(before: dict[str, Any], after: dict[str, Any]) -> int:
    hours = _convocation_hours(before)
    after_hours = _convocation_hours(after)
    before_ts = _team_ts_map(before)
    after_ts = _team_ts_map(after)
    before_ids = set(before_ts)
    after_ids = set(after_ts)
    changed = 0
    paired_added: set[tuple[str, str]] = set()

    for identity in before_ids & after_ids:
        old_ts = before_ts[identity]
        new_ts = after_ts[identity]
        if hours.get(old_ts) != after_hours.get(new_ts, hours.get(new_ts)):
            changed += 1

    removed = list(before_ids - after_ids)
    added = list(after_ids - before_ids)
    for old_id in removed:
        old_ts = before_ts[old_id]
        old_hour = hours.get(old_ts)
        paired = _pair_changed_identities(old_id, set(added), paired_added)
        if paired is None:
            continue
        paired_added.add(paired)
        new_ts = after_ts[paired]
        if old_hour != after_hours.get(new_ts, hours.get(new_ts)):
            changed += 1

    return changed


def _ts_numbers_changed(before: dict[str, Any], after: dict[str, Any]) -> bool:
    before_ts = _team_ts_map(before)
    after_ts = _team_ts_map(after)
    before_ids = set(before_ts)
    after_ids = set(after_ts)
    paired_added: set[tuple[str, str]] = set()

    for identity in before_ids & after_ids:
        if before_ts[identity] != after_ts[identity]:
            return True

    removed = list(before_ids - after_ids)
    added = list(after_ids - before_ids)
    for old_id in removed:
        old_ts = before_ts[old_id]
        paired = _pair_changed_identities(old_id, set(added), paired_added)
        if paired is None:
            continue
        paired_added.add(paired)
        if after_ts[paired] != old_ts:
            return True
    return False


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
        elif len(identities) <= _MAX_GROUP_PERM:
            perms: list[list[tuple[tuple[str, str], int]]] = []
            for perm in permutations(slots):
                perms.append(list(zip(identities, perm, strict=True)))
            slot_options.append(perms)
        else:
            slot_options.append([list(zip(identities, slots, strict=True))])

    assignments: list[dict[tuple[str, str], int]] = []
    for combo in product(*slot_options):
        assignment: dict[tuple[str, str], int] = {}
        for group_pairs in combo:
            for identity, ts in group_pairs:
                assignment[identity] = ts
        assignments.append(assignment)
    return assignments


_MAX_EXHAUSTIVE_TEAMS = 9
_MAX_GROUP_PERM = 8
_SKIP_OPTIMIZE_TEAMS = 32


def _team_count(snapshot: dict[str, Any]) -> int:
    equipes = snapshot.get("equipes")
    if isinstance(equipes, list) and equipes:
        return len(equipes)
    meta = snapshot.get("meta") or {}
    if isinstance(meta, dict):
        return int(meta.get("nb_equipes") or 0)
    return 0


def _can_optimize_ts(snapshot: dict[str, Any]) -> bool:
    count = _team_count(snapshot)
    return count > 1 and count != _SKIP_OPTIMIZE_TEAMS


def _hour_slot_groups(hours_by_ts: dict[int, str]) -> list[list[int]]:
    by_hour: dict[str, list[int]] = {}
    for ts, hour in sorted(hours_by_ts.items()):
        by_hour.setdefault(hour, []).append(ts)
    return [slots for slots in by_hour.values() if len(slots) > 1]


def _assignments_zero_cost_permutations(
    current_ts: dict[tuple[str, str], int],
    hours_by_ts: dict[int, str],
) -> list[dict[tuple[str, str], int]]:
    """Permute les équipes entre TS partageant la même heure de convocation."""
    assignments = [dict(current_ts)]
    ts_to_team = {ts: identity for identity, ts in current_ts.items()}

    for slots in _hour_slot_groups(hours_by_ts):
        identities = [ts_to_team.get(slot) for slot in slots]
        if any(identity is None for identity in identities):
            continue
        next_assignments: list[dict[tuple[str, str], int]] = []
        for base in assignments:
            for perm in permutations(slots):
                candidate = dict(base)
                for identity, ts in zip(identities, perm, strict=True):
                    candidate[identity] = ts
                next_assignments.append(candidate)
        assignments = next_assignments

    return assignments


def _all_slot_assignments(
    current_ts: dict[tuple[str, str], int],
) -> list[dict[tuple[str, str], int]]:
    identities = list(current_ts.keys())
    slots = sorted(current_ts.values())
    if len(identities) != len(slots):
        return []
    return [dict(zip(identities, perm, strict=True)) for perm in permutations(slots)]


def _min_convocation_assignment(
    current_ts: dict[tuple[str, str], int],
    hours_by_ts: dict[int, str],
) -> dict[tuple[str, str], int]:
    """Assignation optimale (coût convocation minimal) via algorithme hongrois."""
    identities = list(current_ts.keys())
    slots = sorted(current_ts.values())
    n = len(identities)
    if n == 0 or len(slots) != n:
        return dict(current_ts)

    hour_of = {ts: hours_by_ts.get(ts, "") for ts in slots}
    old_ts = {identity: current_ts[identity] for identity in identities}
    old_hour = {identity: hour_of.get(old_ts[identity], "") for identity in identities}

    size = n
    cost = [[0] * size for _ in range(size)]
    for row, identity in enumerate(identities):
        for col, slot in enumerate(slots):
            cost[row][col] = 0 if old_hour[identity] == hour_of.get(slot, "") else 1

    # Kuhn-Munkres (minimisation)
    u = [0] * (size + 1)
    v = [0] * (size + 1)
    p = [0] * (size + 1)
    way = [0] * (size + 1)
    for i in range(1, size + 1):
        p[0] = i
        j0 = 0
        minv = [10**9] * (size + 1)
        used = [False] * (size + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = 10**9
            j1 = 0
            for j in range(1, size + 1):
                if used[j]:
                    continue
                cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                if cur < minv[j]:
                    minv[j] = cur
                    way[j] = j0
                if minv[j] < delta:
                    delta = minv[j]
                    j1 = j
            for j in range(size + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break

    assignment: dict[tuple[str, str], int] = {}
    for j in range(1, size + 1):
        identity = identities[p[j] - 1]
        assignment[identity] = slots[j - 1]
    return assignment


def _enumerate_assignment_candidates(
    teams: list[dict[str, Any]],
    current_ts: dict[tuple[str, str], int],
    hours_by_ts: dict[int, str],
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
    for candidate in _assignments_zero_cost_permutations(current_ts, hours_by_ts):
        add(candidate)
    for candidate in _build_sportif_assignments(teams):
        add(candidate)
    add(_min_convocation_assignment(current_ts, hours_by_ts))
    if len(teams) <= _MAX_EXHAUSTIVE_TEAMS:
        for candidate in _all_slot_assignments(current_ts):
            add(candidate)
    return candidates


def _choose_best_assignment(
    teams: list[dict[str, Any]],
    current_ts: dict[tuple[str, str], int],
    hours_by_ts: dict[int, str],
) -> tuple[dict[tuple[str, str], int], int, bool]:
    poids_by_team = {_team_identity(equipe): int(equipe.get("poids") or 999_999) for equipe in teams}
    candidates = _enumerate_assignment_candidates(teams, current_ts, hours_by_ts)
    if not candidates:
        return dict(current_ts), 0, _sportif_valid(current_ts, poids_by_team)

    sportif_needed = not _sportif_valid(current_ts, poids_by_team)
    if sportif_needed:
        sportif_candidates = [candidate for candidate in candidates if _sportif_valid(candidate, poids_by_team)]
        if sportif_candidates:
            candidates = sportif_candidates

    def conv_cost(candidate: dict[tuple[str, str], int]) -> int:
        return _convocation_cost(current_ts, candidate, hours_by_ts)

    def ts_moves(candidate: dict[tuple[str, str], int]) -> int:
        return sum(1 for identity, ts in current_ts.items() if candidate.get(identity, ts) != ts)

    def rank(candidate: dict[tuple[str, str], int]) -> tuple[int, int, int]:
        cost = conv_cost(candidate)
        sportif_penalty = 0 if _sportif_valid(candidate, poids_by_team) else 1
        return (cost, sportif_penalty, ts_moves(candidate))

    best = min(candidates, key=rank)
    return best, conv_cost(best), _sportif_valid(best, poids_by_team)


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


def _optimize_ts_assignment(snapshot: dict[str, Any]) -> tuple[bool, int, bool]:
    if not _can_optimize_ts(snapshot):
        equipes = snapshot.get("equipes") or []
        current_ts = _team_ts_map(snapshot)
        poids_by_team = {_team_identity(equipe): int(equipe.get("poids") or 999_999) for equipe in equipes}
        return False, 0, _sportif_valid(current_ts, poids_by_team)

    equipes = snapshot.get("equipes")
    if not isinstance(equipes, list) or len(equipes) < 2:
        empty: dict[tuple[str, str], int] = {}
        return False, 0, _sportif_valid(empty, {})

    hours_by_ts = _convocation_hours(snapshot)
    current_ts = _team_ts_map(snapshot)

    best, conv_cost, sportif_ok = _choose_best_assignment(equipes, current_ts, hours_by_ts)
    ts_changed = _apply_ts_assignment(snapshot, best)
    return ts_changed, conv_cost, sportif_ok


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
    old_poids = int(equipe.get("poids") or 0)
    old_c1 = int(equipe.get("classement_j1") or 0)
    old_c2 = int(equipe.get("classement_j2") or 0)
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
    new_poids = int(equipe.get("poids") or 0)
    new_c1 = int(equipe.get("classement_j1") or 0)
    new_c2 = int(equipe.get("classement_j2") or 0)
    label_court, label = _labels_equipe(j1, j2, ts)
    equipe["label_court"] = label_court
    equipe["label"] = label

    _apply_label_replacement(snapshot, old_labels, label_court)
    ranking_changed = new_poids != old_poids or new_c1 != old_c1 or new_c2 != old_c2
    if ranking_changed:
        _optimize_ts_assignment(snapshot)
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
    _optimize_ts_assignment(snapshot)
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
            "ts_modified": ts_modified,
            "bracket_modified": bracket_modified,
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
    if mode not in {"partner", "replace"}:
        raise ValueError("Mode de changement inconnu.")

    before = copy.deepcopy(snapshot)
    after = apply_team_change(copy.deepcopy(snapshot), payload)
    ts_modified = _ts_numbers_changed(before, after)
    bracket_modified = ts_modified
    convocations_changed = _team_convocation_changes(before, after)

    if mode == "partner" and convocations_changed > 0:
        result = "blocked"
        impact = _impact_flags(
            mode,
            result,
            convocations_changed,
            ts_modified=ts_modified,
            bracket_modified=bracket_modified,
        )
        return {
            "result": result,
            "message": (
                f"Incompatible — {convocations_changed} convocation(s) seraient décalée(s). "
                "Choisissez un remplaçant avec un créneau équivalent ou remplacez l'équipe entière."
            ),
            "convocations_changed": convocations_changed,
            **impact,
        }

    if ts_modified:
        result = "adjust"
        if convocations_changed == 0:
            message = (
                "Compatible — aucune convocation ne change "
                "(classement TS corrigé sans déplacer les créneaux)."
            )
        else:
            message = (
                f"Compatible avec ajustement du tirage — {convocations_changed} convocation(s) "
                "modifiée(s) (meilleure solution sportive trouvée)."
            )
    else:
        result = "ok"
        message = "Compatible — aucune convocation ne change."

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
