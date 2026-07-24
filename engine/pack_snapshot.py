"""Snapshot Manager live leger pour Engine (lecture JSON, pas d'imports live_*)."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

SNAPSHOT_VERSION = "engine-live-snapshot-1"


def _charger_cache_json(template_path: Path) -> dict:
    from engine.live_template_cache import charger_cache_live

    return charger_cache_live(Path(template_path))


def _serialiser_match(match) -> dict:
    return {
        "ordre": match.ordre,
        "code": match.code,
        "tour": match.tour,
        "equipe1": match.equipe1_label(),
        "equipe2": match.equipe2_label(),
        "terrain": match.terrain,
        "heure": match.heure,
        "jour": getattr(match, "jour", 1),
        "ordre_planning": getattr(match, "ordre_planning", match.ordre),
        "parents": list(match.parents),
    }


def _serialiser_tournoi(tournoi) -> dict:
    principal = getattr(tournoi, "format_match_tableau_principal", None)
    classement = getattr(tournoi, "format_match_classement", "identique")
    finale = getattr(tournoi, "format_match_finale", "identique")
    poule = getattr(tournoi, "format_match_poule", "identique")

    def _resoudre(choix):
        if choix == "identique" and principal:
            return principal
        return choix

    formats_match = None
    if principal:
        formats_match = {
            "tableau_principal": principal,
            "classement": _resoudre(classement),
            "finale": _resoudre(finale),
            "poule": _resoudre(poule)
            if tournoi.mode_tournoi == "Poules + tableau final"
            else None,
        }

    return {
        "club": tournoi.club,
        "logo_url": None,
        "date_tournoi": tournoi.date_tournoi,
        "type_tournoi": tournoi.type_tournoi,
        "genre_tournoi": getattr(tournoi, "genre_tournoi", None),
        "mode_tournoi": tournoi.mode_tournoi,
        "nb_equipes": tournoi.nb_equipes,
        "nb_jours": tournoi.nb_jours,
        "terrains": list(tournoi.terrains),
        "terrain_principal": tournoi.terrain_principal,
        "heure_debut": tournoi.heure_debut,
        "duree_match": tournoi.duree_match,
        "format_match_tableau_principal": principal,
        "format_match_classement": classement,
        "format_match_finale": finale,
        "format_match_poule": poule,
        "formats_match": formats_match,
    }


def _enrichir_planning_layout(
    planning_layout: dict[str, list[dict]],
    fields: dict[str, str],
) -> dict[str, list[dict]]:
    for slide_fields in planning_layout.values():
        for field in slide_fields:
            if not field["key"].endswith("_DONE"):
                continue
            code_key = field["key"].replace("_DONE", "_CODE")
            field["match_code"] = fields.get(code_key, "")
    return planning_layout


def _construire_champs(tournoi, matchs) -> dict[str, str]:
    from engine.ppt_engine import (
        construire_valeurs_globales,
        construire_valeurs_matchs,
        construire_valeurs_planning,
        construire_valeurs_points,
        construire_valeurs_poules,
    )

    valeurs: dict[str, str] = {}
    valeurs.update(construire_valeurs_globales(tournoi))
    valeurs.update(construire_valeurs_matchs(matchs))
    valeurs.update(construire_valeurs_poules(tournoi))
    valeurs.update(construire_valeurs_planning(matchs, tournoi))
    valeurs.update(construire_valeurs_points(tournoi))

    champs: dict[str, str] = {}
    for balise, valeur in valeurs.items():
        champs[balise.strip("{}")] = str(valeur) if valeur is not None else ""
    return champs


def construire_snapshot(
    tournoi,
    matchs,
    template_path,
    pdf_filename: str,
) -> dict:
    cache = _charger_cache_json(template_path)
    fields = _construire_champs(tournoi, matchs)
    planning_layout = dict(cache.get("planning_layout") or {})
    if planning_layout:
        planning_layout = _enrichir_planning_layout(planning_layout, fields)

    return {
        "version": SNAPSHOT_VERSION,
        "pdf_filename": pdf_filename,
        "meta": _serialiser_tournoi(tournoi),
        "matches": [_serialiser_match(match) for match in matchs],
        "fields": fields,
        "page_map": cache["page_map"],
        "planning_layout": planning_layout,
        "page_sizes": cache.get("page_sizes") or {},
    }


def ecrire_snapshot_temporaire(
    tournoi,
    matchs,
    template_path,
    pdf_filename: str,
) -> Path:
    snapshot = construire_snapshot(tournoi, matchs, template_path, pdf_filename)
    fd, nom = tempfile.mkstemp(suffix=".live.json")
    os.close(fd)
    chemin = Path(nom)
    chemin.write_text(json.dumps(snapshot, ensure_ascii=False), encoding="utf-8")
    return chemin


def lire_snapshot(chemin: Path) -> dict:
    return json.loads(Path(chemin).read_text(encoding="utf-8"))
