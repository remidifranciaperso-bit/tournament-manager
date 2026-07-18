"""Point d'entrée génération Engine V2."""

from __future__ import annotations

from pathlib import Path

from engine.live_snapshot import construire_snapshot_engine
from engine.live_valeurs import construire_champs_live
from engine.tournament_build import construire_tournoi_et_matchs
from engine_v2.config import SNAPSHOT_VERSION
from engine_v2.pdf_document import build_tournament_pdf
from engine_v2.template_registry import export_basename, resolve_template_bundle


def _load_logo(logo_path: Path | None) -> tuple[bytes | None, tuple[int, int] | None]:
    if logo_path is None or not logo_path.is_file():
        return None, None
    try:
        from PIL import Image

        raw = logo_path.read_bytes()
        with Image.open(logo_path) as img:
            return raw, (int(img.width), int(img.height))
    except Exception:
        return None, None


def generate_tournament_v2(
    excel_path,
    club,
    date_tournoi,
    type_tournoi,
    heure_debut,
    duree_match,
    terrains,
    terrain_principal,
    base_dir,
    mode_tournoi="Élimination directe",
    nb_jours=1,
    heures_debut_jours=None,
    logo_path=None,
    genre_tournoi=None,
    methode_poules="Méthode du serpentin",
    format_match_tableau_principal=None,
    format_match_classement="identique",
    format_match_finale="identique",
    format_match_poule="identique",
) -> tuple[Path, dict]:
    """
    Génère un PDF tournoi via rendu PyMuPDF (sans PPTX / LibreOffice).

    Retourne (chemin_pdf, snapshot_live_compatible).
    """
    base_dir = Path(base_dir)
    tournoi, matchs = construire_tournoi_et_matchs(
        excel_path=excel_path,
        club=club,
        date_tournoi=date_tournoi,
        type_tournoi=type_tournoi,
        heure_debut=heure_debut,
        duree_match=duree_match,
        terrains=terrains,
        terrain_principal=terrain_principal,
        mode_tournoi=mode_tournoi,
        nb_jours=nb_jours,
        heures_debut_jours=heures_debut_jours,
        genre_tournoi=genre_tournoi,
        methode_poules=methode_poules,
        format_match_tableau_principal=format_match_tableau_principal,
        format_match_classement=format_match_classement,
        format_match_finale=format_match_finale,
        format_match_poule=format_match_poule,
    )

    if format_match_tableau_principal:
        tournoi.format_match_tableau_principal = format_match_tableau_principal
    tournoi.format_match_classement = format_match_classement
    tournoi.format_match_finale = format_match_finale
    tournoi.format_match_poule = format_match_poule
    if genre_tournoi:
        tournoi.genre_tournoi = genre_tournoi

    _template_path, template_id, cache = resolve_template_bundle(tournoi, base_dir)
    fields = construire_champs_live(tournoi, matchs)

    logo_file = Path(logo_path) if logo_path else None
    logo_bytes, logo_wh = _load_logo(logo_file)

    doc = build_tournament_pdf(
        base_dir=base_dir,
        tournoi=tournoi,
        matchs=matchs,
        template_id=template_id,
        cache=cache,
        fields=fields,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
    )

    exports_dir = base_dir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    pdf_filename = f"{export_basename(tournoi)}.pdf"
    pdf_path = exports_dir / pdf_filename

    try:
        doc.save(str(pdf_path), garbage=4, deflate=True)
    finally:
        doc.close()

    snapshot = construire_snapshot_engine(
        tournoi,
        matchs,
        cache,
        pdf_filename,
        logo_path=logo_file,
    )
    snapshot["version"] = SNAPSHOT_VERSION
    snapshot["engine"] = "v2-render"
    snapshot["meta"]["template_id"] = template_id

    return pdf_path, snapshot
