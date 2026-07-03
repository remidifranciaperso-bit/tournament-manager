def calculer_tetes_de_serie(equipes):
    equipes = equipes.copy()

    equipes = equipes.sort_values("poids_paire").reset_index(drop=True)
    equipes["equipe"] = equipes.index + 1
    equipes["ts"] = ["TS" + str(i) for i in range(1, len(equipes) + 1)]

    return equipes