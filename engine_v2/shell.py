"""PDF coquille Engine (slides template) pour composite Live — identique export Manager."""

from __future__ import annotations

import os
from pathlib import Path


def _form_fields_pour_shell(
    *,
    club: str,
    date_tournoi: str,
    type_tournoi: str,
    genre_tournoi: str | None,
    mode_tournoi: str,
    methode_poules: str,
    nb_jours: int,
    heures_debut_jours: list[str],
    duree_match: int,
    terrains: list[str],
    terrain_principal: str,
    format_match_tableau_principal: str | None,
    format_match_classement: str,
    format_match_finale: str,
    format_match_poule: str,
) -> dict[str, str]:
    fields = {
        "club": club,
        "date_tournoi": date_tournoi,
        "type_tournoi": type_tournoi,
        "genre_tournoi": genre_tournoi or "",
        "mode_tournoi": mode_tournoi,
        "methode_poules": methode_poules,
        "nb_jours": str(nb_jours),
        "heures_debut_jours": __import__("json").dumps(heures_debut_jours),
        "duree_match": str(duree_match),
        "terrains": __import__("json").dumps(terrains),
        "terrain_principal": terrain_principal,
        "format_match_classement": format_match_classement,
        "format_match_finale": format_match_finale,
        "format_match_poule": format_match_poule,
    }
    if format_match_tableau_principal:
        fields["format_match_tableau_principal"] = format_match_tableau_principal
    return fields


def generate_shell_pdf(
    *,
    excel_path: Path,
    logo_path: Path | None,
    base_dir: Path,
    output_dir: Path,
    **form_kwargs,
) -> Path:
    """
    Génère le PDF coquille (toutes les slides template) comme Engine V1.

    Requis pour ``exporter_pdf_tournoi_manager`` : indices de slides alignés
    sur le template PPTX + bandeaux Engine pour le composite.
    """
    from engine.remote_generate import generer_pdf_via_engine, soffice_disponible
    from engine.tournament_engine import generate_tournament

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if soffice_disponible():
        pdf_path, _snapshot = generate_tournament(
            excel_path=excel_path,
            logo_path=logo_path,
            base_dir=base_dir,
            **form_kwargs,
        )
        return Path(pdf_path)

    engine_url = os.environ.get("ENGINE_SHELL_URL", "").strip()
    if not engine_url:
        engine_url = "https://tournament-manager-9ytu.onrender.com"

    form_fields = _form_fields_pour_shell(**form_kwargs)
    return generer_pdf_via_engine(
        engine_url,
        excel_path=Path(excel_path),
        logo_path=Path(logo_path) if logo_path else None,
        form_fields=form_fields,
        output_dir=output_dir,
    )
