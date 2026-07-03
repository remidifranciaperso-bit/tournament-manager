import random

from engine.models.match import Match


POULES = ["A", "B", "C", "D"]


def _equipes_triees_par_ts(equipes):
    return sorted(
        equipes,
        key=lambda equipe: equipe.ts,
    )


def _repartir_serpentin(equipes, nb_poules=4):
    poules = {poule: [] for poule in POULES[:nb_poules]}

    equipes_triees = _equipes_triees_par_ts(equipes)

    for index, equipe in enumerate(equipes_triees):
        ligne = index // nb_poules
        colonne = index % nb_poules

        if ligne % 2 == 1:
            colonne = nb_poules - 1 - colonne

        poule = POULES[colonne]
        poules[poule].append(equipe)

    return poules


def _repartir_tas_par_rang(equipes, nb_poules=4, seed=None):
    rng = random.Random(seed)

    poules = {poule: [] for poule in POULES[:nb_poules]}
    equipes_triees = _equipes_triees_par_ts(equipes)

    chapeaux = [
        equipes_triees[i:i + nb_poules]
        for i in range(0, len(equipes_triees), nb_poules)
    ]

    for chapeau in chapeaux:
        chapeau_melange = list(chapeau)
        rng.shuffle(chapeau_melange)

        for index, equipe in enumerate(chapeau_melange):
            poule = POULES[index]
            poules[poule].append(equipe)

    return poules


def _tirer_poules(
    teams,
    ts_exemptes,
    seed=None,
    methode="Méthode du serpentin",
):
    ts = {team.ts: team for team in teams}

    exemptes = [ts[i] for i in ts_exemptes]

    ts_exemptes_set = set(ts_exemptes)

    equipes_poules = [
        team
        for team in teams
        if team.ts not in ts_exemptes_set
    ]

    if methode == "Tirage au sort par rang":
        poules = _repartir_tas_par_rang(
            equipes=equipes_poules,
            nb_poules=4,
            seed=seed,
        )
    else:
        poules = _repartir_serpentin(
            equipes=equipes_poules,
            nb_poules=4,
        )

    return exemptes, poules


def _matchs_poule_4(poule, equipes, start_order):
    prefix = f"P{poule}_M"

    return [
        Match(start_order + 0, f"{prefix}1", f"Poule {poule}", equipes[0], equipes[3]),
        Match(start_order + 1, f"{prefix}2", f"Poule {poule}", equipes[1], equipes[2]),
        Match(start_order + 2, f"{prefix}3", f"Poule {poule}", equipes[0], equipes[2]),
        Match(start_order + 3, f"{prefix}4", f"Poule {poule}", equipes[3], equipes[1]),
        Match(start_order + 4, f"{prefix}5", f"Poule {poule}", equipes[0], equipes[1]),
        Match(start_order + 5, f"{prefix}6", f"Poule {poule}", equipes[2], equipes[3]),
    ]


def _matchs_poule_5(poule, equipes, start_order):
    prefix = f"P{poule}_M"

    return [
        Match(start_order + 0, f"{prefix}1", f"Poule {poule}", equipes[0], equipes[4]),
        Match(start_order + 1, f"{prefix}2", f"Poule {poule}", equipes[1], equipes[3]),
        Match(start_order + 2, f"{prefix}3", f"Poule {poule}", equipes[0], equipes[3]),
        Match(start_order + 3, f"{prefix}4", f"Poule {poule}", equipes[2], equipes[4]),
        Match(start_order + 4, f"{prefix}5", f"Poule {poule}", equipes[0], equipes[2]),
        Match(start_order + 5, f"{prefix}6", f"Poule {poule}", equipes[1], equipes[4]),
        Match(start_order + 6, f"{prefix}7", f"Poule {poule}", equipes[0], equipes[1]),
        Match(start_order + 7, f"{prefix}8", f"Poule {poule}", equipes[2], equipes[3]),
        Match(start_order + 8, f"{prefix}9", f"Poule {poule}", equipes[1], equipes[2]),
        Match(start_order + 9, f"{prefix}10", f"Poule {poule}", equipes[3], equipes[4]),
    ]


def _ajouter_matchs_poules_4(matchs, poules):
    ordre = 1

    for poule in POULES:
        matchs.extend(
            _matchs_poule_4(
                poule=poule,
                equipes=poules[poule],
                start_order=ordre,
            )
        )
        ordre += 6

    return matchs


def _ajouter_matchs_poules_5(matchs, poules):
    ordre = 1

    for poule in POULES:
        matchs.extend(
            _matchs_poule_5(
                poule=poule,
                equipes=poules[poule],
                start_order=ordre,
            )
        )
        ordre += 10

    return matchs


def construire_bracket_20_poules(
    teams,
    seed=None,
    methode="Méthode du serpentin",
):
    if len(teams) != 20:
        raise ValueError("Le moteur poules 20 fonctionne uniquement avec 20 équipes.")

    exemptes, poules = _tirer_poules(
        teams=teams,
        ts_exemptes=range(1, 5),
        seed=seed,
        methode=methode,
    )

    matchs = []
    _ajouter_matchs_poules_4(matchs, poules)

    ts1 = exemptes[0]
    ts2 = exemptes[1]
    ts34 = [exemptes[2], exemptes[3]]

    rng = random.Random(seed)
    rng.shuffle(ts34)

    matchs.extend([
        Match(25, "Q1", "Quart", ts2, "Vainqueur Poule A"),
        Match(26, "Q2", "Quart", ts34[0], "Vainqueur Poule B"),
        Match(27, "Q3", "Quart", "Vainqueur Poule C", ts34[1]),
        Match(28, "Q4", "Quart", "Vainqueur Poule D", ts1),

        Match(29, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(30, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),

        Match(31, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(32, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(33, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(34, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(35, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(36, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),
    ])

    return matchs, exemptes, poules


def construire_bracket_24_poules(
    teams,
    seed=None,
    methode="Méthode du serpentin",
):
    if len(teams) != 24:
        raise ValueError("Le moteur poules 24 fonctionne uniquement avec 24 équipes.")

    exemptes, poules = _tirer_poules(
        teams=teams,
        ts_exemptes=range(1, 9),
        seed=seed,
        methode=methode,
    )

    matchs = []
    _ajouter_matchs_poules_4(matchs, poules)

    ts1 = exemptes[0]
    ts2 = exemptes[1]

    ts34 = [
        exemptes[2],
        exemptes[3],
    ]

    ts5_8 = [
        exemptes[4],
        exemptes[5],
        exemptes[6],
        exemptes[7],
    ]

    rng = random.Random(seed)
    rng.shuffle(ts34)
    rng.shuffle(ts5_8)

    matchs.extend([
        Match(25, "H1", "Huitième", ts2, "Deuxième Poule A"),
        Match(26, "H2", "Huitième", ts5_8[0], "Vainqueur Poule D"),
        Match(27, "H3", "Huitième", ts5_8[1], "Deuxième Poule B"),
        Match(28, "H4", "Huitième", ts34[0], "Vainqueur Poule C"),

        Match(29, "H5", "Huitième", "Deuxième Poule C", ts34[1]),
        Match(30, "H6", "Huitième", "Vainqueur Poule B", ts5_8[2]),
        Match(31, "H7", "Huitième", "Deuxième Poule D", ts5_8[3]),
        Match(32, "H8", "Huitième", "Vainqueur Poule A", ts1),

        Match(33, "Q1", "Quart", "Vainqueur H1", "Vainqueur H2", parents=["H1", "H2"]),
        Match(34, "Q2", "Quart", "Vainqueur H3", "Vainqueur H4", parents=["H3", "H4"]),
        Match(35, "Q3", "Quart", "Vainqueur H5", "Vainqueur H6", parents=["H5", "H6"]),
        Match(36, "Q4", "Quart", "Vainqueur H7", "Vainqueur H8", parents=["H7", "H8"]),

        Match(37, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(38, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),

        Match(39, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(40, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(41, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(42, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(43, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(44, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),

        Match(45, "C9_16_1", "Classement 9-16", "Perdant H1", "Perdant H2", parents=["H1", "H2"]),
        Match(46, "C9_16_2", "Classement 9-16", "Perdant H3", "Perdant H4", parents=["H3", "H4"]),
        Match(47, "C9_16_3", "Classement 9-16", "Perdant H5", "Perdant H6", parents=["H5", "H6"]),
        Match(48, "C9_16_4", "Classement 9-16", "Perdant H7", "Perdant H8", parents=["H7", "H8"]),

        Match(49, "C9_12_1", "Classement 9-12", "Vainqueur C9_16_1", "Vainqueur C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(50, "C9_12_2", "Classement 9-12", "Vainqueur C9_16_3", "Vainqueur C9_16_4", parents=["C9_16_3", "C9_16_4"]),
        Match(51, "C13_16_1", "Classement 13-16", "Perdant C9_16_1", "Perdant C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(52, "C13_16_2", "Classement 13-16", "Perdant C9_16_3", "Perdant C9_16_4", parents=["C9_16_3", "C9_16_4"]),

        Match(53, "C9_10", "Classement 9-10", "Vainqueur C9_12_1", "Vainqueur C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(54, "C11_12", "Classement 11-12", "Perdant C9_12_1", "Perdant C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(55, "C13_14", "Classement 13-14", "Vainqueur C13_16_1", "Vainqueur C13_16_2", parents=["C13_16_1", "C13_16_2"]),
        Match(56, "C15_16", "Classement 15-16", "Perdant C13_16_1", "Perdant C13_16_2", parents=["C13_16_1", "C13_16_2"]),
    ])

    return matchs, exemptes, poules


def construire_bracket_32_poules(
    teams,
    seed=None,
    methode="Méthode du serpentin",
):
    if len(teams) != 32:
        raise ValueError("Le moteur poules 32 fonctionne uniquement avec 32 équipes.")

    exemptes, poules = _tirer_poules(
        teams=teams,
        ts_exemptes=range(1, 13),
        seed=seed,
        methode=methode,
    )

    matchs = []
    _ajouter_matchs_poules_5(matchs, poules)

    matchs.extend([
        Match(41, "H1", "Huitième", exemptes[1], "Vainqueur Poule A"),
        Match(42, "H2", "Huitième", exemptes[7], exemptes[8]),
        Match(43, "H3", "Huitième", exemptes[3], "Vainqueur Poule D"),
        Match(44, "H4", "Huitième", exemptes[4], exemptes[11]),

        Match(45, "H5", "Huitième", exemptes[2], "Vainqueur Poule C"),
        Match(46, "H6", "Huitième", exemptes[6], exemptes[9]),
        Match(47, "H7", "Huitième", exemptes[5], exemptes[10]),
        Match(48, "H8", "Huitième", exemptes[0], "Vainqueur Poule B"),

        Match(49, "Q1", "Quart", "Vainqueur H1", "Vainqueur H2", parents=["H1", "H2"]),
        Match(50, "Q2", "Quart", "Vainqueur H3", "Vainqueur H4", parents=["H3", "H4"]),
        Match(51, "Q3", "Quart", "Vainqueur H5", "Vainqueur H6", parents=["H5", "H6"]),
        Match(52, "Q4", "Quart", "Vainqueur H7", "Vainqueur H8", parents=["H7", "H8"]),

        Match(53, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(54, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),

        Match(55, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(56, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(57, "C9_16_1", "Classement 9-16", "Perdant H1", "Perdant H2", parents=["H1", "H2"]),
        Match(58, "C9_16_2", "Classement 9-16", "Perdant H3", "Perdant H4", parents=["H3", "H4"]),
        Match(59, "C9_16_3", "Classement 9-16", "Perdant H5", "Perdant H6", parents=["H5", "H6"]),
        Match(60, "C9_16_4", "Classement 9-16", "Perdant H7", "Perdant H8", parents=["H7", "H8"]),

        Match(61, "C9_12_1", "Classement 9-12", "Vainqueur C9_16_1", "Vainqueur C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(62, "C9_12_2", "Classement 9-12", "Vainqueur C9_16_3", "Vainqueur C9_16_4", parents=["C9_16_3", "C9_16_4"]),

        Match(63, "C13_16_1", "Classement 13-16", "Perdant C9_16_1", "Perdant C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(64, "C13_16_2", "Classement 13-16", "Perdant C9_16_3", "Perdant C9_16_4", parents=["C9_16_3", "C9_16_4"]),

        Match(65, "C9_10", "Classement 9-10", "Vainqueur C9_12_1", "Vainqueur C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(66, "C11_12", "Classement 11-12", "Perdant C9_12_1", "Perdant C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(67, "C13_14", "Classement 13-14", "Vainqueur C13_16_1", "Vainqueur C13_16_2", parents=["C13_16_1", "C13_16_2"]),
        Match(68, "C15_16", "Classement 15-16", "Perdant C13_16_1", "Perdant C13_16_2", parents=["C13_16_1", "C13_16_2"]),

        Match(69, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(70, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(71, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(72, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),
    ])

    return matchs, exemptes, poules