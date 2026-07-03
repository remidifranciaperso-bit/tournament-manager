from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from engine.excel_reader import lire_excel
from engine.team_builder import construire_paires
from engine.seed_engine import calculer_tetes_de_serie
from engine.models.converter import dataframe_to_teams
from engine.models.tournament import Tournament
from engine.bracket_generator import generer_tableau
from engine.schedule_engine import ajouter_planning
from engine.ppt_engine import remplir_template_8

print("=== TOURNAMENT MANAGER ===")

excel_files = list((BASE_DIR / "data").glob("*.xlsx"))

if not excel_files:
    print("Aucun fichier Excel trouvé dans data.")
    exit()

excel = excel_files[0]

df = lire_excel(excel)

equipes_df = construire_paires(df)
equipes_df = calculer_tetes_de_serie(equipes_df)

teams = dataframe_to_teams(equipes_df)

tournoi = Tournament(
    club="Club Test",
    date_tournoi="2026-06-11",
    type_tournoi="P25",
    equipes=teams,
    heure_debut="18:00",
    duree_match=40,
    terrains=["Omnes", "Cupra", "Credit Agricole", "Armezinc"],
    terrain_principal="Omnes",
)

matchs = generer_tableau(tournoi, seed=42)

matchs = ajouter_planning(
    matchs,
    terrains=tournoi.terrains,
    heure_debut=tournoi.heure_debut,
    duree_match=tournoi.duree_match,
    terrain_principal=tournoi.terrain_principal,
)

template_path = BASE_DIR / "templates" / "Template_8.pptx"
output_path = BASE_DIR / "exports" / "Template_8_rempli.pptx"

remplir_template_8(template_path, output_path, tournoi, matchs)

print(f"PowerPoint généré : {output_path}")