import gc
from pathlib import Path

from engine.live_snapshot import construire_snapshot_engine
from engine.live_template_cache import charger_cache_live
from engine.ppt_engine import remplir_template
from engine.pdf_engine import convertir_pptx_en_pdf
from engine.tournament_build import (
    chemin_template,
    construire_nom_export,
    construire_tournoi_et_matchs,
)

FORMATS_DISPONIBLES = [8, 12, 16, 20, 24]


def generate_tournament(
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

    template_path = chemin_template(tournoi, base_dir)
    cache = charger_cache_live(template_path)
    exports_dir = base_dir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    nom_export = construire_nom_export(
        type_tournoi=tournoi.type_tournoi,
        club=tournoi.club,
        date_tournoi=tournoi.date_tournoi,
    )
    pdf_filename = f"{nom_export}.pdf"

    snapshot = construire_snapshot_engine(
        tournoi,
        matchs,
        cache,
        pdf_filename,
        logo_path=logo_path,
    )

    pptx_path = exports_dir / f"{nom_export}.pptx"

    remplir_template(
        template_path=template_path,
        output_path=pptx_path,
        tournoi=tournoi,
        matchs=matchs,
        logo_path=logo_path,
    )

    pdf_path = convertir_pptx_en_pdf(
        pptx_path=pptx_path,
        output_dir=exports_dir,
    )

    try:
        pptx_path.unlink(missing_ok=True)
    except OSError:
        pass
    gc.collect()

    return pdf_path, snapshot


# Rétrocompat tests / scripts
def init_live_session(*args, **kwargs):
    from engine.live_init import init_live_session as _init

    return _init(*args, **kwargs)


def generate_tournament_live(*args, **kwargs):
    raise RuntimeError(
        "generate_tournament_live est obsolète : utilisez generate_tournament + init_live_session."
    )
