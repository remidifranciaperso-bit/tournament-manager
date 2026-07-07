from pathlib import Path

from engine.live_page_map import cartographier_pages_live, indices_depuis_page_map
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


def template_id_depuis_chemin(template_path: Path) -> str:
    return Path(template_path).stem


def construire_payload_live(
    tournoi,
    matchs,
    template_path: Path,
    base_dir: Path,
    pptx_path: Path | None = None,
) -> dict:
    page_map = cartographier_pages_live(
        template_path,
        pptx_path or template_path,
    )
    needed = indices_depuis_page_map(page_map)

    if not needed:
        raise RuntimeError(
            "Impossible de cartographier les pages du tournoi pour le live."
        )

    template_id = template_id_depuis_chemin(template_path)
    fields = construire_champs_live(tournoi, matchs)

    return {
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "template_id": template_id,
        "fields": fields,
        "live_version": "mask-v4",
    }
