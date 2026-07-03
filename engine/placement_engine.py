import random
from engine.models.match import Match


def _construire_tableau_16_depuis_positions(positions, start_order=1):
    return [
        Match(start_order + 0, "H1", "Huitième", positions[0], positions[1]),
        Match(start_order + 1, "H2", "Huitième", positions[2], positions[3]),
        Match(start_order + 2, "H3", "Huitième", positions[4], positions[5]),
        Match(start_order + 3, "H4", "Huitième", positions[6], positions[7]),
        Match(start_order + 4, "H5", "Huitième", positions[8], positions[9]),
        Match(start_order + 5, "H6", "Huitième", positions[10], positions[11]),
        Match(start_order + 6, "H7", "Huitième", positions[12], positions[13]),
        Match(start_order + 7, "H8", "Huitième", positions[14], positions[15]),

        Match(start_order + 8, "Q1", "Quart", "Vainqueur H1", "Vainqueur H2", parents=["H1", "H2"]),
        Match(start_order + 9, "Q2", "Quart", "Vainqueur H3", "Vainqueur H4", parents=["H3", "H4"]),
        Match(start_order + 10, "Q3", "Quart", "Vainqueur H5", "Vainqueur H6", parents=["H5", "H6"]),
        Match(start_order + 11, "Q4", "Quart", "Vainqueur H7", "Vainqueur H8", parents=["H7", "H8"]),

        Match(start_order + 12, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(start_order + 13, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),

        Match(start_order + 14, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(start_order + 15, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(start_order + 16, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(start_order + 17, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(start_order + 18, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(start_order + 19, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),

        Match(start_order + 20, "C9_16_1", "Classement 9-16", "Perdant H1", "Perdant H2", parents=["H1", "H2"]),
        Match(start_order + 21, "C9_16_2", "Classement 9-16", "Perdant H3", "Perdant H4", parents=["H3", "H4"]),
        Match(start_order + 22, "C9_16_3", "Classement 9-16", "Perdant H5", "Perdant H6", parents=["H5", "H6"]),
        Match(start_order + 23, "C9_16_4", "Classement 9-16", "Perdant H7", "Perdant H8", parents=["H7", "H8"]),

        Match(start_order + 24, "C9_12_1", "Classement 9-12", "Vainqueur C9_16_1", "Vainqueur C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(start_order + 25, "C9_12_2", "Classement 9-12", "Vainqueur C9_16_3", "Vainqueur C9_16_4", parents=["C9_16_3", "C9_16_4"]),

        Match(start_order + 26, "C13_16_1", "Classement 13-16", "Perdant C9_16_1", "Perdant C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(start_order + 27, "C13_16_2", "Classement 13-16", "Perdant C9_16_3", "Perdant C9_16_4", parents=["C9_16_3", "C9_16_4"]),

        Match(start_order + 28, "C9_10", "Classement 9-10", "Vainqueur C9_12_1", "Vainqueur C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(start_order + 29, "C11_12", "Classement 11-12", "Perdant C9_12_1", "Perdant C9_12_2", parents=["C9_12_1", "C9_12_2"]),

        Match(start_order + 30, "C13_14", "Classement 13-14", "Vainqueur C13_16_1", "Vainqueur C13_16_2", parents=["C13_16_1", "C13_16_2"]),
        Match(start_order + 31, "C15_16", "Classement 15-16", "Perdant C13_16_1", "Perdant C13_16_2", parents=["C13_16_1", "C13_16_2"]),
    ]


def _positions_tableau_16_standard(ts, rng):
    positions = [None] * 16

    positions[0] = ts[2]
    positions[15] = ts[1]

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)
    positions[4] = ts34[0]
    positions[11] = ts34[1]

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)
    for pos, team in zip([2, 6, 9, 13], ts5_8):
        positions[pos] = team

    ts15_16 = [ts[15], ts[16]]
    rng.shuffle(ts15_16)
    positions[1] = ts15_16[0]
    positions[14] = ts15_16[1]

    ts9_14 = [ts[i] for i in range(9, 15)]
    rng.shuffle(ts9_14)
    for pos, team in zip([3, 5, 7, 8, 10, 12], ts9_14):
        positions[pos] = team

    return positions


def _positions_tableau_16_avec_entrants(ts, rng, entrants):
    positions = [None] * 16

    positions[0] = ts[2]
    positions[15] = ts[1]

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)
    positions[4] = ts34[0]
    positions[11] = ts34[1]

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)
    for pos, team in zip([2, 6, 9, 13], ts5_8):
        positions[pos] = team

    libres = [i for i, p in enumerate(positions) if p is None]

    for pos, entrant in zip(libres, entrants):
        positions[pos] = entrant

    return positions


def _creer_preliminaires(ts, codes, haut_range, bas_range, rng):
    chapeau_haut = [ts[i] for i in haut_range]
    chapeau_bas = [ts[i] for i in bas_range]

    rng.shuffle(chapeau_haut)
    rng.shuffle(chapeau_bas)

    matchs = []

    for index, code in enumerate(codes):
        matchs.append(
            Match(
                index + 1,
                code,
                "Préliminaire",
                chapeau_haut[index],
                chapeau_bas[index],
            )
        )

    return matchs


def construire_bracket_8(teams, seed=None):
    if len(teams) != 8:
        raise ValueError("Le moteur 8 fonctionne uniquement avec 8 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)

    ts56 = [ts[5], ts[6]]
    rng.shuffle(ts56)

    ts78 = [ts[7], ts[8]]
    rng.shuffle(ts78)

    positions = [
        ts[2],
        ts78[0],

        ts34[0],
        ts56[0],

        ts56[1],
        ts34[1],

        ts78[1],
        ts[1],
    ]

    return [
        Match(1, "Q1", "Quart", positions[0], positions[1]),
        Match(2, "Q2", "Quart", positions[2], positions[3]),
        Match(3, "Q3", "Quart", positions[4], positions[5]),
        Match(4, "Q4", "Quart", positions[6], positions[7]),
        Match(5, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(6, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),
        Match(7, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(8, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),
        Match(9, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(10, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(11, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(12, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),
    ]

def construire_bracket_12(teams, seed=None):
    if len(teams) != 12:
        raise ValueError("Le moteur 12 fonctionne uniquement avec 12 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)

    ts9_12 = [ts[9], ts[10], ts[11], ts[12]]
    rng.shuffle(ts9_12)

    matchs = [
        Match(1, "P1", "Préliminaire", ts5_8[0], ts9_12[0]),
        Match(2, "P2", "Préliminaire", ts5_8[1], ts9_12[1]),
        Match(3, "P3", "Préliminaire", ts9_12[2], ts5_8[2]),
        Match(4, "P4", "Préliminaire", ts9_12[3], ts5_8[3]),

        Match(5, "Q1", "Quart", ts[2], "Vainqueur P1", parents=["P1"]),
        Match(6, "Q2", "Quart", ts34[0], "Vainqueur P2", parents=["P2"]),
        Match(7, "Q3", "Quart", "Vainqueur P3", ts34[1], parents=["P3"]),
        Match(8, "Q4", "Quart", "Vainqueur P4", ts[1], parents=["P4"]),

        Match(9, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(10, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),
        Match(11, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(12, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(13, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(14, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(15, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(16, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),

        Match(17, "C9_12_1", "Classement 9-12", "Perdant P1", "Perdant P2", parents=["P1", "P2"]),
        Match(18, "C9_12_2", "Classement 9-12", "Perdant P3", "Perdant P4", parents=["P3", "P4"]),
        Match(19, "C9_10", "Classement 9-10", "Vainqueur C9_12_1", "Vainqueur C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(20, "C11_12", "Classement 11-12", "Perdant C9_12_1", "Perdant C9_12_2", parents=["C9_12_1", "C9_12_2"]),
    ]

    return matchs

def construire_bracket_16(teams, seed=None):
    if len(teams) != 16:
        raise ValueError("Le moteur 16 fonctionne uniquement avec 16 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    positions = _positions_tableau_16_standard(ts, rng)

    return _construire_tableau_16_depuis_positions(positions)

def construire_bracket_20(teams, seed=None):
    if len(teams) != 20:
        raise ValueError("Le moteur 20 fonctionne uniquement avec 20 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)

    ts9_12 = [ts[9], ts[10], ts[11], ts[12]]
    rng.shuffle(ts9_12)

    # Préliminaires :
    # première moitié TS13-16 vs deuxième moitié TS17-20
    ts13_16 = [ts[13], ts[14], ts[15], ts[16]]
    ts17_20 = [ts[17], ts[18], ts[19], ts[20]]

    rng.shuffle(ts13_16)
    rng.shuffle(ts17_20)

    matchs = [
        Match(1, "P1", "Préliminaire", ts13_16[0], ts17_20[0]),
        Match(2, "P2", "Préliminaire", ts13_16[1], ts17_20[1]),
        Match(3, "P3", "Préliminaire", ts17_20[2], ts13_16[2]),
        Match(4, "P4", "Préliminaire", ts17_20[3], ts13_16[3]),
    ]

    positions = [
        ts[2],
        "Vainqueur P1",

        ts5_8[0],
        ts9_12[0],

        ts34[0],
        "Vainqueur P2",

        ts5_8[1],
        ts9_12[1],

        ts9_12[2],
        ts5_8[2],

        "Vainqueur P3",
        ts34[1],

        ts9_12[3],
        ts5_8[3],

        "Vainqueur P4",
        ts[1],
    ]

    tableau = _construire_tableau_16_depuis_positions(
        positions,
        start_order=5,
    )

    tableau.extend([
        Match(37, "C17_20_1", "Classement 17-20", "Perdant P1", "Perdant P2", parents=["P1", "P2"]),
        Match(38, "C17_20_2", "Classement 17-20", "Perdant P3", "Perdant P4", parents=["P3", "P4"]),
        Match(39, "C17_18", "Classement 17-18", "Vainqueur C17_20_1", "Vainqueur C17_20_2", parents=["C17_20_1", "C17_20_2"]),
        Match(40, "C19_20", "Classement 19-20", "Perdant C17_20_1", "Perdant C17_20_2", parents=["C17_20_1", "C17_20_2"]),
    ])

    return matchs + tableau

def construire_bracket_24(teams, seed=None):
    if len(teams) != 24:
        raise ValueError("Le moteur 24 fonctionne uniquement avec 24 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)

    ts9_16 = [ts[i] for i in range(9, 17)]
    rng.shuffle(ts9_16)

    ts17_24 = [ts[i] for i in range(17, 25)]
    rng.shuffle(ts17_24)

    matchs = [
        Match(1, "P1", "Préliminaire", ts9_16[0], ts17_24[0]),
        Match(2, "P2", "Préliminaire", ts9_16[1], ts17_24[1]),
        Match(3, "P3", "Préliminaire", ts9_16[2], ts17_24[2]),
        Match(4, "P4", "Préliminaire", ts9_16[3], ts17_24[3]),

        Match(5, "P5", "Préliminaire", ts17_24[4], ts9_16[4]),
        Match(6, "P6", "Préliminaire", ts17_24[5], ts9_16[5]),
        Match(7, "P7", "Préliminaire", ts17_24[6], ts9_16[6]),
        Match(8, "P8", "Préliminaire", ts17_24[7], ts9_16[7]),
    ]

    positions = [
        ts[2],
        "Vainqueur P1",

        ts5_8[0],
        "Vainqueur P2",

        ts5_8[1],
        "Vainqueur P3",

        ts34[0],
        "Vainqueur P4",

        "Vainqueur P5",
        ts34[1],

        "Vainqueur P6",
        ts5_8[2],

        "Vainqueur P7",
        ts5_8[3],

        "Vainqueur P8",
        ts[1],
    ]

    tableau = _construire_tableau_16_depuis_positions(
        positions,
        start_order=9,
    )

    tableau.extend([
        Match(41, "C17_24_1", "Classement 17-24", "Perdant P1", "Perdant P2", parents=["P1", "P2"]),
        Match(42, "C17_24_2", "Classement 17-24", "Perdant P3", "Perdant P4", parents=["P3", "P4"]),
        Match(43, "C17_24_3", "Classement 17-24", "Perdant P5", "Perdant P6", parents=["P5", "P6"]),
        Match(44, "C17_24_4", "Classement 17-24", "Perdant P7", "Perdant P8", parents=["P7", "P8"]),
        Match(45, "C17_20_1", "Classement 17-20", "Vainqueur C17_24_1", "Vainqueur C17_24_2", parents=["C17_24_1", "C17_24_2"]),
        Match(46, "C17_20_2", "Classement 17-20", "Vainqueur C17_24_3", "Vainqueur C17_24_4", parents=["C17_24_3", "C17_24_4"]),
        Match(47, "C21_24_1", "Classement 21-24", "Perdant C17_24_1", "Perdant C17_24_2", parents=["C17_24_1", "C17_24_2"]),
        Match(48, "C21_24_2", "Classement 21-24", "Perdant C17_24_3", "Perdant C17_24_4", parents=["C17_24_3", "C17_24_4"]),
        Match(49, "C17_18", "Classement 17-18", "Vainqueur C17_20_1", "Vainqueur C17_20_2", parents=["C17_20_1", "C17_20_2"]),
        Match(50, "C19_20", "Classement 19-20", "Perdant C17_20_1", "Perdant C17_20_2", parents=["C17_20_1", "C17_20_2"]),
        Match(51, "C21_22", "Classement 21-22", "Vainqueur C21_24_1", "Vainqueur C21_24_2", parents=["C21_24_1", "C21_24_2"]),
        Match(52, "C23_24", "Classement 23-24", "Perdant C21_24_1", "Perdant C21_24_2", parents=["C21_24_1", "C21_24_2"]),
    ])

    return matchs + tableau
    
def construire_bracket_32(teams, seed=None):
    if len(teams) != 32:
        raise ValueError("Le moteur 32 fonctionne uniquement avec 32 équipes.")

    rng = random.Random(seed)
    ts = {team.ts: team for team in teams}

    positions = [None] * 32
    positions[0] = ts[2]
    positions[31] = ts[1]

    ts34 = [ts[3], ts[4]]
    rng.shuffle(ts34)
    positions[15] = ts34[0]
    positions[16] = ts34[1]

    ts5_8 = [ts[5], ts[6], ts[7], ts[8]]
    rng.shuffle(ts5_8)

    for pos, equipe in zip([7, 8, 23, 24], ts5_8):
        positions[pos] = equipe

    ts9_16 = [ts[i] for i in range(9, 17)]
    rng.shuffle(ts9_16)

    for pos, equipe in zip([3, 4, 11, 12, 19, 20, 27, 28], ts9_16):
        positions[pos] = equipe

    ts17_32 = [ts[i] for i in range(17, 33)]
    rng.shuffle(ts17_32)

    libres = [i for i, p in enumerate(positions) if p is None]

    for pos, equipe in zip(libres, ts17_32):
        positions[pos] = equipe

    matchs = []

    for i in range(16):
        matchs.append(
            Match(
                i + 1,
                f"S{i + 1}",
                "Seizième",
                positions[i * 2],
                positions[i * 2 + 1],
            )
        )

    matchs.extend([
        Match(17, "H1", "Huitième", "Vainqueur S1", "Vainqueur S2", parents=["S1", "S2"]),
        Match(18, "H2", "Huitième", "Vainqueur S3", "Vainqueur S4", parents=["S3", "S4"]),
        Match(19, "H3", "Huitième", "Vainqueur S5", "Vainqueur S6", parents=["S5", "S6"]),
        Match(20, "H4", "Huitième", "Vainqueur S7", "Vainqueur S8", parents=["S7", "S8"]),
        Match(21, "H5", "Huitième", "Vainqueur S9", "Vainqueur S10", parents=["S9", "S10"]),
        Match(22, "H6", "Huitième", "Vainqueur S11", "Vainqueur S12", parents=["S11", "S12"]),
        Match(23, "H7", "Huitième", "Vainqueur S13", "Vainqueur S14", parents=["S13", "S14"]),
        Match(24, "H8", "Huitième", "Vainqueur S15", "Vainqueur S16", parents=["S15", "S16"]),

        Match(25, "Q1", "Quart", "Vainqueur H1", "Vainqueur H2", parents=["H1", "H2"]),
        Match(26, "Q2", "Quart", "Vainqueur H3", "Vainqueur H4", parents=["H3", "H4"]),
        Match(27, "Q3", "Quart", "Vainqueur H5", "Vainqueur H6", parents=["H5", "H6"]),
        Match(28, "Q4", "Quart", "Vainqueur H7", "Vainqueur H8", parents=["H7", "H8"]),

        Match(29, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", parents=["Q1", "Q2"]),
        Match(30, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", parents=["Q3", "Q4"]),
        Match(31, "PF", "Petite Finale", "Perdant D1", "Perdant D2", parents=["D1", "D2"]),
        Match(32, "F", "Finale", "Vainqueur D1", "Vainqueur D2", parents=["D1", "D2"]),

        Match(33, "C5_8_1", "Classement 5-8", "Perdant Q1", "Perdant Q2", parents=["Q1", "Q2"]),
        Match(34, "C5_8_2", "Classement 5-8", "Perdant Q3", "Perdant Q4", parents=["Q3", "Q4"]),
        Match(35, "C7_8", "Classement 7-8", "Perdant C5_8_1", "Perdant C5_8_2", parents=["C5_8_1", "C5_8_2"]),
        Match(36, "C5_6", "Classement 5-6", "Vainqueur C5_8_1", "Vainqueur C5_8_2", parents=["C5_8_1", "C5_8_2"]),

        Match(37, "C9_16_1", "Classement 9-16", "Perdant H1", "Perdant H2", parents=["H1", "H2"]),
        Match(38, "C9_16_2", "Classement 9-16", "Perdant H3", "Perdant H4", parents=["H3", "H4"]),
        Match(39, "C9_16_3", "Classement 9-16", "Perdant H5", "Perdant H6", parents=["H5", "H6"]),
        Match(40, "C9_16_4", "Classement 9-16", "Perdant H7", "Perdant H8", parents=["H7", "H8"]),

        Match(41, "C9_12_1", "Classement 9-12", "Vainqueur C9_16_1", "Vainqueur C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(42, "C9_12_2", "Classement 9-12", "Vainqueur C9_16_3", "Vainqueur C9_16_4", parents=["C9_16_3", "C9_16_4"]),
        Match(43, "C13_16_1", "Classement 13-16", "Perdant C9_16_1", "Perdant C9_16_2", parents=["C9_16_1", "C9_16_2"]),
        Match(44, "C13_16_2", "Classement 13-16", "Perdant C9_16_3", "Perdant C9_16_4", parents=["C9_16_3", "C9_16_4"]),
        Match(45, "C9_10", "Classement 9-10", "Vainqueur C9_12_1", "Vainqueur C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(46, "C11_12", "Classement 11-12", "Perdant C9_12_1", "Perdant C9_12_2", parents=["C9_12_1", "C9_12_2"]),
        Match(47, "C13_14", "Classement 13-14", "Vainqueur C13_16_1", "Vainqueur C13_16_2", parents=["C13_16_1", "C13_16_2"]),
        Match(48, "C15_16", "Classement 15-16", "Perdant C13_16_1", "Perdant C13_16_2", parents=["C13_16_1", "C13_16_2"]),
    ])

    suite = [
        ("C17_32_1", "Perdant S1", "Perdant S2", ["S1", "S2"]),
        ("C17_32_2", "Perdant S3", "Perdant S4", ["S3", "S4"]),
        ("C17_32_3", "Perdant S5", "Perdant S6", ["S5", "S6"]),
        ("C17_32_4", "Perdant S7", "Perdant S8", ["S7", "S8"]),
        ("C17_32_5", "Perdant S9", "Perdant S10", ["S9", "S10"]),
        ("C17_32_6", "Perdant S11", "Perdant S12", ["S11", "S12"]),
        ("C17_32_7", "Perdant S13", "Perdant S14", ["S13", "S14"]),
        ("C17_32_8", "Perdant S15", "Perdant S16", ["S15", "S16"]),

        ("C17_24_1", "Vainqueur C17_32_1", "Vainqueur C17_32_2", ["C17_32_1", "C17_32_2"]),
        ("C17_24_2", "Vainqueur C17_32_3", "Vainqueur C17_32_4", ["C17_32_3", "C17_32_4"]),
        ("C17_24_3", "Vainqueur C17_32_5", "Vainqueur C17_32_6", ["C17_32_5", "C17_32_6"]),
        ("C17_24_4", "Vainqueur C17_32_7", "Vainqueur C17_32_8", ["C17_32_7", "C17_32_8"]),

        ("C25_32_1", "Perdant C17_32_1", "Perdant C17_32_2", ["C17_32_1", "C17_32_2"]),
        ("C25_32_2", "Perdant C17_32_3", "Perdant C17_32_4", ["C17_32_3", "C17_32_4"]),
        ("C25_32_3", "Perdant C17_32_5", "Perdant C17_32_6", ["C17_32_5", "C17_32_6"]),
        ("C25_32_4", "Perdant C17_32_7", "Perdant C17_32_8", ["C17_32_7", "C17_32_8"]),

        ("C17_20_1", "Vainqueur C17_24_1", "Vainqueur C17_24_2", ["C17_24_1", "C17_24_2"]),
        ("C17_20_2", "Vainqueur C17_24_3", "Vainqueur C17_24_4", ["C17_24_3", "C17_24_4"]),

        ("C21_24_1", "Perdant C17_24_1", "Perdant C17_24_2", ["C17_24_1", "C17_24_2"]),
        ("C21_24_2", "Perdant C17_24_3", "Perdant C17_24_4", ["C17_24_3", "C17_24_4"]),

        ("C25_28_1", "Vainqueur C25_32_1", "Vainqueur C25_32_2", ["C25_32_1", "C25_32_2"]),
        ("C25_28_2", "Vainqueur C25_32_3", "Vainqueur C25_32_4", ["C25_32_3", "C25_32_4"]),

        ("C29_32_1", "Perdant C25_32_1", "Perdant C25_32_2", ["C25_32_1", "C25_32_2"]),
        ("C29_32_2", "Perdant C25_32_3", "Perdant C25_32_4", ["C25_32_3", "C25_32_4"]),

        ("C17_18", "Vainqueur C17_20_1", "Vainqueur C17_20_2", ["C17_20_1", "C17_20_2"]),
        ("C19_20", "Perdant C17_20_1", "Perdant C17_20_2", ["C17_20_1", "C17_20_2"]),

        ("C21_22", "Vainqueur C21_24_1", "Vainqueur C21_24_2", ["C21_24_1", "C21_24_2"]),
        ("C23_24", "Perdant C21_24_1", "Perdant C21_24_2", ["C21_24_1", "C21_24_2"]),

        ("C25_26", "Vainqueur C25_28_1", "Vainqueur C25_28_2", ["C25_28_1", "C25_28_2"]),
        ("C27_28", "Perdant C25_28_1", "Perdant C25_28_2", ["C25_28_1", "C25_28_2"]),

        ("C29_30", "Vainqueur C29_32_1", "Vainqueur C29_32_2", ["C29_32_1", "C29_32_2"]),
        ("C31_32", "Perdant C29_32_1", "Perdant C29_32_2", ["C29_32_1", "C29_32_2"]),
    ]

    for i, (code, equipe1, equipe2, parents) in enumerate(suite, start=49):
        matchs.append(
            Match(
                i,
                code,
                "Classement 17-32",
                equipe1,
                equipe2,
                parents=parents,
            )
        )

    return matchs