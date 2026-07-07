from pathlib import Path

from engine.live_layout import lire_layout_public
from engine.live_page_map import cartographier_pages_live
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
    template_path: Path,
    base_dir: Path,
    pptx_path: Path | None = None,
) -> dict:
    """
    Manager live = même logique de remplissage que l'Engine (ppt_engine),
    affichage via masques PNG template + champs dynamiques (layout.json).
    Les libellés WIN_/LOSE_/SECOND_ sont figés dans le masque ; les placeholders
    {{H1_EQ1}}, scores, etc. sont mis à jour côté front via ``fields``.
    """
    page_map = cartographier_pages_live(
        template_path,
        pptx_path or template_path,
    )

    if not page_map.get("main") and not page_map.get("classement"):
        raise RuntimeError(
            "Impossible de cartographier les pages du tournoi pour le live."
        )

    template_id = Path(template_path).stem
    fields = construire_champs_live(tournoi, matchs)
    layout = lire_layout_public(base_dir, template_id)

    return {
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "template_id": template_id,
        "layout": layout,
        "fields": fields,
        "live_version": "template-v6",
    }
