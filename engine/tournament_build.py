from pathlib import Path

from engine.excel_reader import lire_excel
from engine.team_builder import construire_paires
from engine.seed_engine import calculer_tetes_de_serie
from engine.models.converter import dataframe_to_teams
from engine.models.tournament import Tournament
from engine.bracket_generator import generer_tableau
from engine.schedule_engine import ajouter_planning
from engine.tournament_paths import (
    chemin_template,
    construire_nom_export,
    format_date_fichier,
    nettoyer_nom_fichier,
    verifier_template_existe,
)

FORMATS_DISPONIBLES = [8, 12, 16, 20, 24]


def construire_tournoi_et_matchs(
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
    format_match_tableau_principal=None,
    format_match_classement="identique",
    format_match_finale="identique",
    format_match_poule="identique",
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
    tournoi.format_match_tableau_principal = format_match_tableau_principal
    tournoi.format_match_classement = format_match_classement
    tournoi.format_match_finale = format_match_finale
    tournoi.format_match_poule = format_match_poule

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

    matchs = generer_tableau(tournoi, seed=None)
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
