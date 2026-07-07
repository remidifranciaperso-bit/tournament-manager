import base64
from pathlib import Path

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
    pdf_path: Path,
    template_path: Path,
    pptx_path: Path,
) -> dict:
    """
    Payload Manager live : même PDF que l'Engine, rendu côté navigateur (pdf.js).
    LibreOffice reste côté serveur, invisible pour l'utilisateur.
    """
    page_map = cartographier_pages_live(template_path, pptx_path)

    if not page_map.get("main") and not page_map.get("classement"):
        raise RuntimeError(
            "Impossible de cartographier les pages du tournoi pour le live."
        )

    pdf_bytes = Path(pdf_path).read_bytes()
    fields = construire_champs_live(tournoi, matchs)

    return {
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "fields": fields,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "pdf_filename": Path(pdf_path).name,
        "live_version": "pdf-v5",
    }
