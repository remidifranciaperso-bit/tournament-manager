import pandas as pd


def lire_excel(chemin_fichier):
    """
    Lit uniquement la première feuille du fichier Excel.

    La détection des colonnes et des formats différents
    est ensuite gérée dans team_builder.py.
    """

    fichier = pd.ExcelFile(chemin_fichier)

    premier_onglet = fichier.sheet_names[0]

    df = pd.read_excel(
        chemin_fichier,
        sheet_name=premier_onglet,
    )

    df = df.dropna(how="all")

    df.columns = [
        str(col).strip()
        for col in df.columns
    ]

    print("\n==============================")
    print("LECTURE EXCEL")
    print("==============================")
    print("Onglet retenu :", premier_onglet)
    print("Colonnes trouvées :")
    print(list(df.columns))
    print("Nombre de lignes :", len(df))
    print("==============================\n")

    return df.reset_index(drop=True)