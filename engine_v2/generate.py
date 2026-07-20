"""Point d'entrée génération Engine V2 — coquille V2 PyMuPDF + captures Live + composite."""

from __future__ import annotations

from pathlib import Path

from engine.live_snapshot import construire_snapshot_engine
from engine.tournament_build import construire_tournoi_et_matchs
from engine_v2.config import SNAPSHOT_VERSION
from engine_v2.pdf_export import exporter_pdf_engine_v2
from engine_v2.shell import _load_logo, build_v2_composite_shell_pdf
from engine_v2.template_registry import export_basename, resolve_template_bundle


def _construire_tournoi(
    *,
    excel_path,
    club,
    date_tournoi,
    type_tournoi,
    heure_debut,
    duree_match,
    terrains,
    terrain_principal,
    base_dir,
    mode_tournoi,
    nb_jours,
    heures_debut_jours,
    genre_tournoi,
    methode_poules,
    format_match_tableau_principal,
    format_match_classement,
    format_match_finale,
    format_match_poule,
):
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
    return tournoi, matchs


def prepare_tournament_v2(
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
) -> tuple[Path, dict, str]:
    """
    Coquille PDF V2 (PyMuPDF, sans LibreOffice) + snapshot Live.

    Le PDF final = captures DOM Live + composite (identique export Manager).
    """
    base_dir = Path(base_dir)
    heures_debut_jours = heures_debut_jours or [heure_debut]
    logo_file = Path(logo_path) if logo_path else None
    logo_bytes, logo_wh = _load_logo(logo_file)

    tournoi, matchs = _construire_tournoi(
        excel_path=excel_path,
        club=club,
        date_tournoi=date_tournoi,
        type_tournoi=type_tournoi,
        heure_debut=heure_debut,
        duree_match=duree_match,
        terrains=terrains,
        terrain_principal=terrain_principal,
        base_dir=base_dir,
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

    _template_path, template_id, cache = resolve_template_bundle(tournoi, base_dir)
    pdf_filename = f"{export_basename(tournoi)}.pdf"

    shell_path, _ = build_v2_composite_shell_pdf(
        tournoi=tournoi,
        matchs=matchs,
        base_dir=base_dir,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
    )

    snapshot = construire_snapshot_engine(
        tournoi,
        matchs,
        cache,
        pdf_filename,
        logo_path=logo_file,
    )
    snapshot["version"] = SNAPSHOT_VERSION
    snapshot["engine"] = "v2-live-capture"
    snapshot["meta"]["template_id"] = template_id
    return shell_path, snapshot, pdf_filename


def composite_tournament_v2_pdf(
    *,
    shell_pdf: Path,
    output_pdf: Path,
    snapshot: dict,
    captures: dict[str, str],
    logo_path: Path | None = None,
    crosspage_stubs: dict | None = None,
) -> Path:
    """Assemble le PDF final (captures Live + bandeaux V2)."""
    output_pdf = Path(output_pdf)
    exporter_pdf_engine_v2(
        Path(shell_pdf),
        output_pdf,
        page_map=snapshot["page_map"],
        captures=captures,
        logo_path=Path(logo_path) if logo_path else None,
        crosspage_stubs=crosspage_stubs,
    )
    return output_pdf
