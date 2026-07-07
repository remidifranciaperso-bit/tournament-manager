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
    return {
        "club": tournoi.club,
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
    }


def construire_payload_live(
    tournoi,
    matchs,
    page_map: dict,
    live_token: str,
    page_sizes: dict[str, dict[str, float]],
    pdf_filename: str,
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

    return {
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "fields": fields,
        "live_token": live_token,
        "page_sizes": page_sizes,
        "pdf_filename": pdf_filename,
        "live_version": "engine-pdf",
    }
