from pathlib import Path
import re
from datetime import datetime

from engine.excel_reader import lire_excel
from engine.team_builder import construire_paires
from engine.seed_engine import calculer_tetes_de_serie
from engine.models.converter import dataframe_to_teams
from engine.models.tournament import Tournament
from engine.bracket_generator import generer_tableau
from engine.schedule_engine import ajouter_planning
from engine.ppt_engine import remplir_template
from engine.pdf_engine import convertir_pptx_en_pdf


FORMATS_DISPONIBLES = [8, 12, 16, 20, 24]


def nettoyer_nom_fichier(texte):
    texte = str(texte).strip()
    texte = texte.replace("/", "-")
    texte = re.sub(r"[^A-Za-z0-9À-ÿ_-]+", "-", texte)
    return texte.strip("-")


def format_date_fichier(date_tournoi):
    try:
        return datetime.strptime(
            str(date_tournoi),
            "%Y-%m-%d"
        ).strftime("%d-%m-%y")
    except Exception:
        return nettoyer_nom_fichier(date_tournoi)


def construire_nom_export(type_tournoi, club, date_tournoi):
    return (
        f"{nettoyer_nom_fichier(type_tournoi)}-"
        f"{nettoyer_nom_fichier(club)}-"
        f"{format_date_fichier(date_tournoi)}"
    )


def verifier_template_existe(template_path):
    if not template_path.exists():
        raise FileNotFoundError(
            f"Template introuvable : {template_path}"
        )

def _construire_tournoi_et_matchs(
    excel_path,
    club,
    date_tournoi,
    type_tournoi,
    heure_debut,
    duree_match,
    terrains,
    terrain_principal,
    mode_tournoi="Élimination directe",
    nb_jours=1,
    heures_debut_jours=None,
    genre_tournoi=None,
    methode_poules="Méthode du serpentin",
):
    type_tournoi = str(type_tournoi).strip()

    if " - " in type_tournoi:
        morceaux = type_tournoi.split(" - ")
        type_tournoi = morceaux[0].strip()

        if genre_tournoi is None and len(morceaux) > 1:
            genre_tournoi = morceaux[1].strip()

    if heures_debut_jours is None:
        heures_debut_jours = [heure_debut]

    df = lire_excel(excel_path)

    equipes_df = construire_paires(df)
    equipes_df = calculer_tetes_de_serie(equipes_df)

    teams = dataframe_to_teams(equipes_df)

    tournoi = Tournament(
        club=club,
        date_tournoi=str(date_tournoi),
        type_tournoi=type_tournoi,
        equipes=teams,
        heure_debut=heure_debut,
        duree_match=int(duree_match),
        terrains=terrains,
        terrain_principal=terrain_principal,
        mode_tournoi=mode_tournoi,
        nb_jours=int(nb_jours),
        heures_debut_jours=heures_debut_jours,
    )

    tournoi.genre_tournoi = genre_tournoi
    tournoi.methode_poules = methode_poules

    if tournoi.nb_jours not in [1, 2, 3]:
        raise ValueError("Le nombre de jours doit être 1, 2 ou 3.")

    if tournoi.nb_equipes in [8, 12, 16] and tournoi.nb_jours != 1:
        raise ValueError(
            "Les formats 8, 12 et 16 équipes sont uniquement disponibles sur 1 jour."
        )

    if tournoi.nb_equipes not in FORMATS_DISPONIBLES:
        raise ValueError(
            f"Nombre d'équipes non supporté pour l'instant : "
            f"{tournoi.nb_equipes}. Formats disponibles : "
            f"{', '.join(str(x) for x in FORMATS_DISPONIBLES)} équipes."
        )

    if (
        tournoi.mode_tournoi == "Poules + tableau final"
        and tournoi.nb_equipes not in [20, 24]
    ):
        raise ValueError(
            "Le mode 'Poules + tableau final' est disponible uniquement pour 20 et 24 équipes."
        )

    matchs = generer_tableau(
        tournoi,
        seed=None,
    )

    matchs = ajouter_planning(
        matchs=matchs,
        terrains=tournoi.terrains,
        heure_debut=tournoi.heure_debut,
        duree_match=tournoi.duree_match,
        terrain_principal=tournoi.terrain_principal,
        nb_jours=tournoi.nb_jours,
        heures_debut_jours=tournoi.heures_debut_jours,
    )

    return tournoi, matchs


def _chemin_template(tournoi, base_dir):
    if tournoi.mode_tournoi == "Poules + tableau final":
        template_nom = (
            f"Template_{tournoi.nb_equipes}_poules_"
            f"{tournoi.nb_jours}J.pptx"
        )
    else:
        template_nom = (
            f"Template_{tournoi.nb_equipes}_"
            f"{tournoi.nb_jours}J.pptx"
        )

    template_path = base_dir / "templates bleus" / template_nom
    verifier_template_existe(template_path)
    return template_path


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
):
    base_dir = Path(base_dir)

    tournoi, matchs = _construire_tournoi_et_matchs(
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
    )

    template_path = _chemin_template(tournoi, base_dir)

    exports_dir = base_dir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    nom_export = construire_nom_export(
        type_tournoi=tournoi.type_tournoi,
        club=tournoi.club,
        date_tournoi=tournoi.date_tournoi,
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

    return pdf_path


def generate_tournament_live(
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
):
    from api.live_store import creer_session, liberer_memoire
    from engine.live_export import construire_payload_live
    from engine.live_page_map import cartographier_pages_live
    from engine.pdf_pages import extraire_pages_sur_disque, indices_depuis_page_map

    base_dir = Path(base_dir)

    tournoi, matchs = _construire_tournoi_et_matchs(
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
    )

    template_path = _chemin_template(tournoi, base_dir)
    exports_dir = base_dir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    nom_export = construire_nom_export(
        type_tournoi=tournoi.type_tournoi,
        club=tournoi.club,
        date_tournoi=tournoi.date_tournoi,
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
    liberer_memoire()

    page_map = cartographier_pages_live(template_path, pptx_path)
    live_token, pages_dir = creer_session(pdf_path, pdf_path.name)
    page_sizes = extraire_pages_sur_disque(
        pdf_path,
        indices_depuis_page_map(page_map),
        pages_dir,
    )
    liberer_memoire()

    return construire_payload_live(
        tournoi=tournoi,
        matchs=matchs,
        page_map=page_map,
        live_token=live_token,
        page_sizes=page_sizes,
        pdf_filename=pdf_path.name,
        layout_path=template_path,
    )