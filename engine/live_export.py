from pathlib import Path

from engine.live_valeurs import construire_champs_live
from engine.models.match import Match


def serialiser_match(match: Match) -> dict:
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


def serialiser_tournoi(tournoi) -> dict:
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


def construire_payload_live(
    tournoi,
    matchs,
    page_map: dict,
    live_token: str,
    page_sizes: dict[str, dict[str, float]],
    pdf_filename: str,
    layout_path=None,
    pdf_path=None,
    planning_layout: dict | None = None,
) -> dict:
    """
    Manager live = PDF Engine découpé par onglet (``/api/live/{token}/page/N``).
    Rendu navigateur natif : polices, emojis et mise en page identiques à l'Engine.
    """
    if not page_map.get("main") and not page_map.get("classement"):
        raise RuntimeError(
            "Impossible de cartographier les pages du tournoi pour le live."
        )

    if not page_sizes:
        raise RuntimeError("Aucune page PDF extraite pour le live.")

    fields = construire_champs_live(tournoi, matchs)

    if planning_layout is None and layout_path is not None:
        from engine.live_layout import (
            calibrer_planning_layout_pdf,
            extraire_layout_planning,
        )

        planning_layout = extraire_layout_planning(layout_path, page_map)
        if pdf_path is not None:
            planning_layout = calibrer_planning_layout_pdf(planning_layout, pdf_path)

    planning_layout = planning_layout or {}
    if planning_layout:
        planning_layout = _enrichir_planning_layout(planning_layout, fields)

    from api.live_store import chemin_logo

    meta = serialiser_tournoi(tournoi)
    if chemin_logo(live_token) is not None:
        meta["logo_url"] = f"/api/live/{live_token}/logo"

    return {
        "meta": meta,
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "fields": fields,
        "planning_layout": planning_layout,
        "live_token": live_token,
        "page_sizes": page_sizes,
        "pdf_filename": pdf_filename,
        "live_version": "engine-pdf",
    }
