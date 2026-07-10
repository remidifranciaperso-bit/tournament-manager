from pathlib import Path

from engine.live_export import construire_payload_live
from engine.live_template_cache import charger_cache_live
from engine.tournament_build import chemin_template, construire_tournoi_et_matchs


def init_live_session(
    pdf_path,
    pdf_filename: str,
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
):
    """Session live depuis un PDF Engine — sans python-pptx ni LibreOffice."""
    from api.live_store import creer_session

    base_dir = Path(base_dir)
    pdf_path = Path(pdf_path)

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

    template_path = chemin_template(tournoi, base_dir)
    cache = charger_cache_live(template_path)

    live_token, _pages_dir, page_sizes = creer_session(
        pdf_path,
        pdf_filename,
        cache["page_map"],
        logo_path=logo_path,
        move_pdf=True,
        page_sizes=cache["page_sizes"],
    )

    return construire_payload_live(
        tournoi=tournoi,
        matchs=matchs,
        page_map=cache["page_map"],
        live_token=live_token,
        page_sizes=page_sizes,
        pdf_filename=pdf_filename,
        layout_path=None,
        pdf_path=None,
        planning_layout=cache.get("planning_layout") or {},
    )
