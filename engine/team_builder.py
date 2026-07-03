import re
import unicodedata

import pandas as pd

from engine.normalizer import full_name, normalize_lastname, normalize_firstname


def normaliser_colonne(texte):
    texte = str(texte).strip().lower()
    texte = unicodedata.normalize("NFD", texte)
    texte = "".join(c for c in texte if unicodedata.category(c) != "Mn")
    texte = re.sub(r"[^a-z0-9]+", " ", texte)
    texte = re.sub(r"\s+", " ", texte)
    return texte.strip()


def nettoyer_nombre(valeur):
    if pd.isna(valeur):
        return 0

    texte = str(valeur).strip()
    texte = texte.replace(" ", "")
    texte = texte.replace(",", ".")
    texte = re.sub(r"[^0-9.]", "", texte)

    if not texte:
        return 0

    try:
        return int(float(texte))
    except Exception:
        return 0


def trouver_colonne(df, candidats):
    colonnes = {
        normaliser_colonne(col): col
        for col in df.columns
    }

    for candidat in candidats:
        candidat_norm = normaliser_colonne(candidat)

        if candidat_norm in colonnes:
            return colonnes[candidat_norm]

    for col_norm, col_originale in colonnes.items():
        for candidat in candidats:
            candidat_norm = normaliser_colonne(candidat)

            if candidat_norm in col_norm:
                return col_originale

    return None


def construire_nom(prenom, nom):
    nom_clean = normalize_lastname(nom)
    prenom_clean = normalize_firstname(prenom)
    return full_name(prenom_clean, nom_clean)


def finaliser_equipes(paires):
    equipes = pd.DataFrame(paires)

    if equipes.empty:
        return None

    equipes = equipes.sort_values("poids_paire").reset_index(drop=True)
    equipes["equipe"] = equipes.index + 1

    return equipes


def construire_paires_format_paires(df):
    col_nom_j1 = trouver_colonne(df, ["Nom J1", "Nom joueur 1", "Joueur 1 nom"])
    col_prenom_j1 = trouver_colonne(df, ["Prénom J1", "Prenom J1", "Prénom joueur 1", "Prenom joueur 1"])
    col_classement_j1 = trouver_colonne(df, ["Classement J1", "Clt J1", "Classement joueur 1"])

    col_nom_j2 = trouver_colonne(df, ["Nom J2", "Nom joueur 2", "Joueur 2 nom"])
    col_prenom_j2 = trouver_colonne(df, ["Prénom J2", "Prenom J2", "Prénom joueur 2", "Prenom joueur 2"])
    col_classement_j2 = trouver_colonne(df, ["Classement J2", "Clt J2", "Classement joueur 2"])

    if not all([
        col_nom_j1,
        col_prenom_j1,
        col_classement_j1,
        col_nom_j2,
        col_prenom_j2,
        col_classement_j2,
    ]):
        return None

    paires = []

    for _, row in df.iterrows():
        if pd.isna(row[col_nom_j1]) or pd.isna(row[col_prenom_j1]):
            continue

        if pd.isna(row[col_nom_j2]) or pd.isna(row[col_prenom_j2]):
            continue

        joueur1 = construire_nom(row[col_prenom_j1], row[col_nom_j1])
        joueur2 = construire_nom(row[col_prenom_j2], row[col_nom_j2])

        classement_j1 = nettoyer_nombre(row[col_classement_j1])
        classement_j2 = nettoyer_nombre(row[col_classement_j2])

        if classement_j1 <= 0 or classement_j2 <= 0:
            continue

        paires.append({
            "joueur1": joueur1,
            "classement_j1": classement_j1,
            "joueur2": joueur2,
            "classement_j2": classement_j2,
            "poids_paire": classement_j1 + classement_j2,
        })

    return finaliser_equipes(paires)


def construire_paires_format_joueurs(df):
    col_nom = trouver_colonne(df, ["Nom"])
    col_prenom = trouver_colonne(df, ["Prénom", "Prenom"])
    col_classement = trouver_colonne(df, ["Classement", "Clt", "Rang"])
    col_nom_partenaire = trouver_colonne(df, ["Nom partenaire", "Partenaire nom", "Nom du partenaire"])
    col_prenom_partenaire = trouver_colonne(df, ["Prénom partenaire", "Prenom partenaire", "Partenaire prénom", "Partenaire prenom"])
    col_poids = trouver_colonne(df, ["Poids paire", "Poids", "Total"])

    if not all([col_nom, col_prenom, col_classement]):
        return None

    df = df.copy()
    df = df.dropna(subset=[col_nom, col_prenom, col_classement])

    df["_nom_clean"] = df[col_nom].apply(normalize_lastname)
    df["_prenom_clean"] = df[col_prenom].apply(normalize_firstname)

    paires = []
    vues = set()

    if col_nom_partenaire and col_prenom_partenaire:
        for _, row in df.iterrows():
            if pd.isna(row[col_nom_partenaire]) or pd.isna(row[col_prenom_partenaire]):
                continue

            nom1 = row["_nom_clean"]
            prenom1 = row["_prenom_clean"]
            nom2 = normalize_lastname(row[col_nom_partenaire])
            prenom2 = normalize_firstname(row[col_prenom_partenaire])

            joueur1 = full_name(prenom1, nom1)
            joueur2 = full_name(prenom2, nom2)

            cle = tuple(sorted([joueur1.lower(), joueur2.lower()]))

            if cle in vues:
                continue

            vues.add(cle)

            classement_j1 = nettoyer_nombre(row[col_classement])

            partenaire_row = df[
                (df["_nom_clean"] == nom2)
                & (df["_prenom_clean"] == prenom2)
            ]

            if not partenaire_row.empty:
                classement_j2 = nettoyer_nombre(partenaire_row.iloc[0][col_classement])
            elif col_poids:
                classement_j2 = nettoyer_nombre(row[col_poids]) - classement_j1
            else:
                classement_j2 = 0

            if classement_j1 <= 0 or classement_j2 <= 0:
                continue

            paires.append({
                "joueur1": joueur1,
                "classement_j1": classement_j1,
                "joueur2": joueur2,
                "classement_j2": classement_j2,
                "poids_paire": classement_j1 + classement_j2,
            })

    else:
        lignes = list(df.iterrows())

        for i in range(0, len(lignes), 2):
            if i + 1 >= len(lignes):
                break

            _, row1 = lignes[i]
            _, row2 = lignes[i + 1]

            joueur1 = construire_nom(row1[col_prenom], row1[col_nom])
            joueur2 = construire_nom(row2[col_prenom], row2[col_nom])

            classement_j1 = nettoyer_nombre(row1[col_classement])
            classement_j2 = nettoyer_nombre(row2[col_classement])

            if classement_j1 <= 0 or classement_j2 <= 0:
                continue

            paires.append({
                "joueur1": joueur1,
                "classement_j1": classement_j1,
                "joueur2": joueur2,
                "classement_j2": classement_j2,
                "poids_paire": classement_j1 + classement_j2,
            })

    return finaliser_equipes(paires)


def construire_paires(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")

    equipes = construire_paires_format_paires(df)

    if equipes is not None:
        print(f"Équipes détectées au format paires : {len(equipes)}")
        return equipes

    equipes = construire_paires_format_joueurs(df)

    if equipes is not None:
        print(f"Équipes détectées au format joueurs : {len(equipes)}")
        return equipes

    raise ValueError(
        "Impossible de détecter les équipes.\n"
        "Formats acceptés :\n"
        "- 1 ligne par paire : Nom J1 / Prénom J1 / Classement J1 / Nom J2 / Prénom J2 / Classement J2\n"
        "- 1 ligne par joueur : Nom / Prénom / Classement / Nom partenaire / Prénom partenaire\n"
        "- 1 ligne par joueur sans partenaire : association 2 par 2 dans l'ordre du fichier\n"
        f"Colonnes disponibles : {list(df.columns)}"
    )