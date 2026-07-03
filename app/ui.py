from pathlib import Path
import sys
import tempfile

import streamlit as st

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from engine.tournament_engine import generate_tournament


st.set_page_config(
    page_title="Tournament Manager",
    page_icon="🏆",
    layout="wide",
)

st.title("🏆 Tournament Manager")
st.caption("Générateur de dossier tournoi padel")

st.divider()

st.header("① Import des fichiers")

excel_file = st.file_uploader(
    "Fichier Excel des participants",
    type=["xlsx"],
)

logo_file = st.file_uploader(
    "Logo du club",
    type=["png", "jpg", "jpeg"],
)

pas_de_logo = st.checkbox(
    "Pas de logo à importer",
    value=False,
)

nb_equipes_detectees = None

if excel_file:
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_preview:
            tmp_preview.write(excel_file.getvalue())
            excel_preview_path = Path(tmp_preview.name)

        from engine.excel_reader import lire_excel
        from engine.team_builder import construire_paires

        df_preview = lire_excel(excel_preview_path)
        equipes_preview = construire_paires(df_preview)
        nb_equipes_detectees = len(equipes_preview)

        st.success(
            f"Fichier chargé : {excel_file.name} — "
            f"{nb_equipes_detectees} équipes détectées"
        )

        if nb_equipes_detectees not in [8, 12, 16, 20, 24]:
            st.warning(
                f"Format à {nb_equipes_detectees} équipes non pris en charge "
                "pour le moment. Formats disponibles : 8, 12, 16, 20, 24 équipes."
            )

    except Exception:
        st.success(f"Fichier chargé : {excel_file.name}")
        st.warning("Impossible de détecter automatiquement le nombre d'équipes.")
else:
    st.info("Aucun fichier Excel chargé pour le moment.")

if logo_file and not pas_de_logo:
    st.success(f"Logo chargé : {logo_file.name}")

st.divider()

st.header("② Paramètres du tournoi")

col1, col2 = st.columns(2)

with col1:
    club = st.text_input(
        "Club organisateur",
        value="Club Test",
        disabled=not pas_de_logo,
    )

    if not pas_de_logo:
        club = ""

    date_tournoi = st.date_input(
        "Date du tournoi",
        format="DD/MM/YYYY",
    )

    type_tournoi = st.selectbox(
        "Type de tournoi",
        ["P25", "P50", "P100", "P250", "P500", "P1000"],
    )

    genre_tournoi = st.selectbox(
        "Catégorie",
        ["Hommes", "Femmes", "Mixte"],
    )

    if nb_equipes_detectees in [20, 24]:
        mode_tournoi = st.selectbox(
            "Format sportif",
            [
                "Élimination directe",
                "Poules + tableau final",
            ],
        )
    else:
        mode_tournoi = "Élimination directe"

        st.selectbox(
            "Format sportif",
            ["Élimination directe"],
            disabled=True,
        )

    methode_poules = "Méthode du serpentin"

    if mode_tournoi == "Poules + tableau final":
        methode_poules = st.selectbox(
            "Constitution des poules",
            [
                "Méthode du serpentin",
                "Tirage au sort par rang",
            ],
        )

with col2:
    if nb_equipes_detectees in [8, 12, 16]:
        nb_jours = 1
    else:
        nb_jours = st.selectbox(
            "Nombre de jours de tournoi",
            [1, 2, 3],
            index=0,
        )

    heures_debut_jours = []

    if nb_jours == 1:
        heure_debut = st.text_input(
            "Heure de début",
            value="18:00",
        )
        heures_debut_jours.append(heure_debut)

    else:
        for jour in range(1, nb_jours + 1):
            heure_jour = st.text_input(
                f"Heure de début jour {jour}",
                value="18:00" if jour == 1 else "09:00",
            )
            heures_debut_jours.append(heure_jour)

        heure_debut = heures_debut_jours[0]

    duree_match = st.number_input(
        "Durée prévisionnelle d'un match (minutes)",
        value=40,
        step=5,
    )

    nb_terrains = st.selectbox(
        "Nombre de terrains",
        [1, 2, 3, 4, 5, 6, 7, 8],
        index=3,
    )

st.subheader("Terrains")

terrains = []

for i in range(nb_terrains):
    nom = st.text_input(
        f"Nom du terrain {i + 1}",
        value=f"Terrain {i + 1}",
    )
    terrains.append(nom)

terrain_principal = st.selectbox(
    "Terrain principal pour la finale",
    terrains,
)

st.divider()

st.header("③ Génération")

style_templates = st.radio(
    "Style du dossier",
    ["Basic", "Avancé"],
    horizontal=True,
)

pret = (
    excel_file is not None
    and len(terrains) > 0
    and (
        pas_de_logo
        or logo_file is not None
    )
    and (
        not pas_de_logo
        or club.strip() != ""
    )
)

if not pret:
    st.warning("Charge un fichier Excel et complète les paramètres avant de générer.")

if st.button(
    "🚀 Générer le tournoi",
    disabled=not pret,
    use_container_width=True,
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp.write(excel_file.getvalue())
            excel_path = Path(tmp.name)

        logo_path = None

        if logo_file and not pas_de_logo:
            suffix = Path(logo_file.name).suffix

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_logo:
                tmp_logo.write(logo_file.getvalue())
                logo_path = Path(tmp_logo.name)

        pdf_path = generate_tournament(
            excel_path=excel_path,
            club=club,
            date_tournoi=date_tournoi,
            type_tournoi=type_tournoi,
            genre_tournoi=genre_tournoi,
            heure_debut=heure_debut,
            duree_match=duree_match,
            terrains=terrains,
            terrain_principal=terrain_principal,
            base_dir=BASE_DIR,
            mode_tournoi=mode_tournoi,
            nb_jours=nb_jours,
            heures_debut_jours=heures_debut_jours,
            logo_path=logo_path,
            style_templates=style_templates,
            methode_poules=methode_poules,
        )

        st.session_state["pdf_path"] = str(pdf_path)

        st.success("PDF généré avec succès.")

    except Exception as e:
        st.error(f"Erreur pendant la génération : {e}")

st.divider()

st.header("④ Télécharger")

pdf_path = st.session_state.get("pdf_path")

if pdf_path and Path(pdf_path).exists():
    pdf_file = Path(pdf_path)

    with open(pdf_file, "rb") as f:
        st.download_button(
            label="📄 Télécharger le PDF final",
            data=f,
            file_name=pdf_file.name,
            mime="application/pdf",
            use_container_width=True,
        )
else:
    st.info("Le PDF sera disponible ici après génération.")