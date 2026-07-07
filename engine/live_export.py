import base64
from pathlib import Path

from engine.live_layout import lire_layout_public
from engine.live_page_map import cartographier_pages_live
from engine.live_valeurs import construire_champs_live
from engine.models.match import Match
from engine.pdf_pages import extraire_pages_pdf, indices_depuis_page_map


def _dimensions_pages_pdf(pdf_path: Path, indices: list[int]) -> dict[str, dict[str, float]]:
    import fitz

    if not indices:
        return {}

    doc = fitz.open(str(pdf_path))
    sizes: dict[str, dict[str, float]] = {}

    try:
        for index in sorted(set(indices)):
            if index < 0 or index >= doc.page_count:
                continue
            rect = doc[index].rect
            sizes[str(index)] = {
                "width": float(rect.width),
                "height": float(rect.height),
            }
    finally:
        doc.close()

    return sizes


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
    base_dir: Path,
) -> dict:
    """
    Manager live = même PDF que l'Engine (remplir_template + LibreOffice).

    - ``page_pdfs`` : une page par onglet, rendu navigateur natif (polices brush/TSL/Noto).
    - ``pdf_base64`` : PDF complet pour export final tournoi.
    - ``fields`` / ``matches`` : état live pour mises à jour dynamiques puis regénération PDF.
    """
    page_map = cartographier_pages_live(template_path, pptx_path)

    if not page_map.get("main") and not page_map.get("classement"):
        raise RuntimeError(
            "Impossible de cartographier les pages du tournoi pour le live."
        )

    needed = indices_depuis_page_map(page_map)
    page_pdfs = extraire_pages_pdf(pdf_path, needed)
    page_sizes = _dimensions_pages_pdf(pdf_path, needed)

    if not page_pdfs:
        raise RuntimeError(
            f"Aucune page PDF extraite ({pdf_path.name}, attendu {needed})."
        )

    template_id = Path(template_path).stem
    fields = construire_champs_live(tournoi, matchs)
    layout = lire_layout_public(base_dir, template_id)
    pdf_bytes = Path(pdf_path).read_bytes()

    return {
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "page_map": page_map,
        "template_id": template_id,
        "layout": layout,
        "fields": fields,
        "page_pdfs": page_pdfs,
        "page_sizes": page_sizes,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "pdf_filename": Path(pdf_path).name,
        "live_version": "pdf-v8",
    }
