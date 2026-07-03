from engine.models.team import Team


def dataframe_to_teams(equipes_df):
    teams = []

    for _, row in equipes_df.iterrows():
        team = Team(
            numero=int(row["equipe"]),
            ts=int(str(row["ts"]).replace("TS", "")),
            joueur1=row["joueur1"],
            classement_j1=int(row["classement_j1"]),
            joueur2=row["joueur2"],
            classement_j2=int(row["classement_j2"]),
            poids=int(row["poids_paire"]),
        )

        teams.append(team)

    return teams