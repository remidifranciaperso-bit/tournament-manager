def construire_tableau_8(equipes):
    """
    Construit un tableau 8 équipes simple.
    Placement amateur :
    TS1 en bas, TS2 en haut.
    """

    if len(equipes) != 8:
        raise ValueError("Ce builder fonctionne uniquement avec 8 équipes.")

    # Ordre visuel du haut vers le bas
    positions = [
        2, 7,
        3, 6,
        4, 5,
        8, 1,
    ]

    equipes_par_numero = {
        int(row["equipe"]): row
        for _, row in equipes.iterrows()
    }

    matchs = [
        {
            "match": "M1",
            "tour": "Quart",
            "equipe1": equipes_par_numero[positions[0]],
            "equipe2": equipes_par_numero[positions[1]],
        },
        {
            "match": "M2",
            "tour": "Quart",
            "equipe1": equipes_par_numero[positions[2]],
            "equipe2": equipes_par_numero[positions[3]],
        },
        {
            "match": "M3",
            "tour": "Quart",
            "equipe1": equipes_par_numero[positions[4]],
            "equipe2": equipes_par_numero[positions[5]],
        },
        {
            "match": "M4",
            "tour": "Quart",
            "equipe1": equipes_par_numero[positions[6]],
            "equipe2": equipes_par_numero[positions[7]],
        },
        {
            "match": "M5",
            "tour": "Demi",
            "equipe1": "Vainqueur M1",
            "equipe2": "Vainqueur M2",
        },
        {
            "match": "M6",
            "tour": "Demi",
            "equipe1": "Vainqueur M3",
            "equipe2": "Vainqueur M4",
        },
        {
            "match": "M7",
            "tour": "Finale",
            "equipe1": "Vainqueur M5",
            "equipe2": "Vainqueur M6",
        },
        {
            "match": "M8",
            "tour": "Petite finale",
            "equipe1": "Perdant M5",
            "equipe2": "Perdant M6",
        },
    ]

    return matchs


def format_equipe(equipe):
    if isinstance(equipe, str):
        return equipe

    return f'{equipe["joueur1"]} / {equipe["joueur2"]} ({equipe["ts"]})'