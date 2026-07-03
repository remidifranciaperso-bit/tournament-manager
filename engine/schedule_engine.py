from datetime import datetime, timedelta


def _format_heure(dt):
    return dt.strftime("%H:%M")


def _assigner_match(
    match,
    heure,
    terrain,
    compteur_terrains,
    ordre_planning,
    jour=1,
):
    match.heure = _format_heure(heure)
    match.terrain = terrain
    match.ordre_planning = ordre_planning
    match.jour = jour

    compteur_terrains[terrain] = (
        compteur_terrains.get(terrain, 0) + 1
    )


def _matchs_par_code(matchs):
    return {
        match.code: match
        for match in matchs
    }


def _matchs_par_tour(matchs):
    tours = {}

    for match in matchs:
        tours.setdefault(
            match.tour,
            []
        ).append(match)

    return tours


def _ordre_match(match):
    return (
        getattr(match, "ordre_planning", 0),
        match.ordre
    )


def _trier_matchs(matchs):
    return sorted(
        matchs,
        key=_ordre_match
    )


def _heure_depart_jour(heures_debut_jours, index):
    if index < len(heures_debut_jours):
        return heures_debut_jours[index]

    return heures_debut_jours[-1]


def _datetime_heure(heure_str):
    return datetime.strptime(
        heure_str,
        "%H:%M"
    )


def _terrains_ordonnes(
    terrains,
    terrain_principal=None
):
    terrains = list(terrains)

    if (
        terrain_principal
        and terrain_principal in terrains
    ):
        terrains.remove(
            terrain_principal
        )

        terrains.insert(
            0,
            terrain_principal
        )

    return terrains


def _codes(matchs):
    return [
        match.code
        for match in matchs
    ]


def _tour(matchs, nom):
    return [
        match
        for match in matchs
        if match.tour == nom
    ]


def _codes_tour(matchs, nom):
    return [
        match.code
        for match in matchs
        if match.tour == nom
    ]


def _ajouter_minutes(
    heure,
    minutes
):
    return heure + timedelta(
        minutes=minutes
    )


def _compteur_terrains(
    terrains
):
    return {
        terrain: 0
        for terrain in terrains
    }

def _choisir_terrain(terrains_disponibles, compteur_terrains, terrain_principal=None):
    return sorted(
        terrains_disponibles,
        key=lambda t: (
            compteur_terrains.get(t, 0),
            0 if terrain_principal and t == terrain_principal else 1,
            terrains_disponibles.index(t),
        ),
    )[0]


def _programmer_vague(
    vague_codes,
    matchs_by_code,
    heure,
    duree_match,
    terrains,
    compteur_terrains,
    ordre_planning,
    terrain_principal=None,
    finale_sur_principal=False,
    jour=1,
):
    matchs_vague = [
        matchs_by_code[code]
        for code in vague_codes
        if code in matchs_by_code
    ]

    index = 0

    while index < len(matchs_vague):
        creneau = matchs_vague[index:index + len(terrains)]
        terrains_disponibles = terrains.copy()

        if finale_sur_principal:
            for match in creneau:
                if match.code == "F" and terrain_principal in terrains_disponibles:
                    _assigner_match(
                        match,
                        heure,
                        terrain_principal,
                        compteur_terrains,
                        ordre_planning,
                        jour=jour,
                    )
                    ordre_planning += 1
                    terrains_disponibles.remove(terrain_principal)

        for match in creneau:
            if match.heure and match.terrain:
                continue

            terrain = _choisir_terrain(
                terrains_disponibles,
                compteur_terrains,
            )

            _assigner_match(
                match,
                heure,
                terrain,
                compteur_terrains,
                ordre_planning,
                jour=jour,
            )

            ordre_planning += 1
            terrains_disponibles.remove(terrain)

        index += len(terrains)
        heure = _ajouter_minutes(heure, duree_match)

    return heure, ordre_planning


def _appliquer_vagues(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
    vagues,
    jour=1,
):
    matchs_by_code = _matchs_par_code(matchs)
    heure = _datetime_heure(heure_debut)
    compteur_terrains = _compteur_terrains(terrains)
    ordre_planning = 1

    for i, vague in enumerate(vagues):
        heure, ordre_planning = _programmer_vague(
            vague,
            matchs_by_code,
            heure,
            duree_match,
            terrains,
            compteur_terrains,
            ordre_planning,
            terrain_principal,
            finale_sur_principal=(i == len(vagues) - 1),
            jour=jour,
        )

    return matchs


def _planning_8(matchs, terrains, heure_debut, duree_match, terrain_principal):
    vagues = [
        ["Q1", "Q2", "Q3", "Q4"],
        ["C5_8_1", "C5_8_2", "D1", "D2"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )


def _planning_12(matchs, terrains, heure_debut, duree_match, terrain_principal):
    vagues = [
        ["P1", "P2", "P3", "P4"],
        ["Q1", "Q2", "Q3", "Q4"],
        ["C9_12_1", "C9_12_2", "C5_8_1", "C5_8_2"],
        ["C9_10", "C11_12", "D1", "D2"],
        ["C5_6", "C7_8", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )


def _planning_16(matchs, terrains, heure_debut, duree_match, terrain_principal):
    vagues = [
        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],
        ["C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4"],
        ["Q1", "Q2", "Q3", "Q4"],
        ["C13_16_1", "C13_16_2", "C9_12_1", "C9_12_2"],
        ["D1", "D2", "C5_8_1", "C5_8_2"],
        ["C15_16", "C13_14", "C11_12", "C9_10"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )

def _planning_20(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
):
    vagues = [
        ["P1", "P2", "P3", "P4"],
        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],
        ["C17_20_1", "C17_20_2", "C9_16_1", "C9_16_2"],
        ["C9_16_3", "C9_16_4", "Q1", "Q2"],
        ["Q3", "Q4", "C19_20", "C17_18"],
        ["C13_16_1", "C13_16_2", "C9_12_1", "C9_12_2"],
        ["D1", "D2", "C15_16", "C13_14"],
        ["C11_12", "C9_10", "C5_8_1", "C5_8_2"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )


def _planning_24(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
):
    vagues = [
        ["P1", "P2", "P3", "P4"],
        ["P5", "P6", "P7", "P8"],
        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],
        ["C17_24_1", "C17_24_2", "C17_24_3", "C17_24_4"],
        ["C21_24_1", "C21_24_2", "C9_16_1", "C9_16_2"],
        ["C9_16_3", "C9_16_4", "Q1", "Q2"],
        ["Q3", "Q4", "C23_24", "C21_22"],
        ["C17_20_1", "C17_20_2", "C13_16_1", "C13_16_2"],
        ["C9_12_1", "C9_12_2", "D1", "D2"],
        ["C19_20", "C17_18", "C15_16", "C13_14"],
        ["C11_12", "C9_10", "C5_8_1", "C5_8_2"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )


def _planning_32(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
):
    vagues = [
        ["S1", "S2", "S3", "S4"],
        ["S5", "S6", "S7", "S8"],
        ["S9", "S10", "S11", "S12"],
        ["S13", "S14", "S15", "S16"],

        ["C17_32_1", "C17_32_2", "C17_32_3", "C17_32_4"],
        ["C17_32_5", "C17_32_6", "C17_32_7", "C17_32_8"],

        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],

        ["C25_32_1", "C25_32_2", "C25_32_3", "C25_32_4"],

        ["C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4"],

        ["C17_24_1", "C17_24_2", "C17_24_3", "C17_24_4"],

        ["Q1", "Q2", "Q3", "Q4"],

        ["C9_12_1", "C9_12_2", "C25_28_1", "C25_28_2"],

        ["C29_32_1", "C29_32_2", "C21_24_1", "C21_24_2"],

        ["C13_16_1", "C13_16_2", "D1", "D2"],

        ["C31_32", "C29_30", "C27_28", "C25_26"],

        ["C23_24", "C21_22", "C17_20_1", "C17_20_2"],

        ["C19_20", "C17_18", "C15_16", "C13_14"],

        ["C11_12", "C9_10", "C5_8_1", "C5_8_2"],

        ["C7_8", "C5_6", "PF", "F"],
    ]

    return _appliquer_vagues(
        matchs,
        terrains,
        heure_debut,
        duree_match,
        terrain_principal,
        vagues,
    )

def _programmer_bloc_jour(
    matchs_by_code,
    vagues,
    jour_index,
    heures_debut_jours,
    heure_debut,
    duree_match,
    terrains,
    compteur_terrains,
    ordre_planning,
    terrain_principal,
):
    heure_depart = (
        heures_debut_jours[min(jour_index, len(heures_debut_jours) - 1)]
        if heures_debut_jours
        else heure_debut
    )

    heure = _datetime_heure(heure_depart)
    jour_reel = jour_index + 1

    for i, vague in enumerate(vagues):
        heure, ordre_planning = _programmer_vague(
            vague,
            matchs_by_code,
            heure,
            duree_match,
            terrains,
            compteur_terrains,
            ordre_planning,
            terrain_principal,
            finale_sur_principal=(i == len(vagues) - 1),
            jour=jour_reel,
        )

    return ordre_planning


def _planning_20_poules(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
    nb_jours=1,
    heures_debut_jours=None,
):
    matchs_by_code = _matchs_par_code(matchs)
    compteur_terrains = _compteur_terrains(terrains)
    ordre_planning = 1
    heures_debut_jours = heures_debut_jours or [heure_debut]

    tableau_final_8 = [
        ["Q1", "Q2", "Q3", "Q4"],
        ["C5_8_1", "C5_8_2", "D1", "D2"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    if nb_jours == 3:
        blocs = [
            [
                ["PA_M1", "PA_M2", "PA_M3", "PA_M4"],
                ["PA_M5", "PA_M6", "PB_M1", "PB_M2"],
                ["PB_M3", "PB_M4", "PB_M5", "PB_M6"],
            ],
            [
                ["PC_M1", "PC_M2", "PC_M3", "PC_M4"],
                ["PC_M5", "PC_M6", "PD_M1", "PD_M2"],
                ["PD_M3", "PD_M4", "PD_M5", "PD_M6"],
            ],
            tableau_final_8,
        ]

    elif nb_jours == 2:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
            ],
            tableau_final_8,
        ]

    else:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
                *tableau_final_8,
            ],
        ]

    for jour_index, vagues in enumerate(blocs):
        ordre_planning = _programmer_bloc_jour(
            matchs_by_code=matchs_by_code,
            vagues=vagues,
            jour_index=jour_index,
            heures_debut_jours=heures_debut_jours,
            heure_debut=heure_debut,
            duree_match=duree_match,
            terrains=terrains,
            compteur_terrains=compteur_terrains,
            ordre_planning=ordre_planning,
            terrain_principal=terrain_principal,
        )

    return matchs

def _planning_24_poules(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
    nb_jours=1,
    heures_debut_jours=None,
):
    matchs_by_code = _matchs_par_code(matchs)
    compteur_terrains = _compteur_terrains(terrains)
    ordre_planning = 1
    heures_debut_jours = heures_debut_jours or [heure_debut]

    tableau_final_16 = [
        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],
        ["C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4"],
        ["Q1", "Q2", "Q3", "Q4"],
        ["C13_16_1", "C13_16_2", "C9_12_1", "C9_12_2"],
        ["D1", "D2", "C5_8_1", "C5_8_2"],
        ["C15_16", "C13_14", "C11_12", "C9_10"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    if nb_jours == 3:
        blocs = [
            [
                ["PA_M1", "PA_M2", "PA_M3", "PA_M4"],
                ["PA_M5", "PA_M6", "PB_M1", "PB_M2"],
                ["PB_M3", "PB_M4", "PB_M5", "PB_M6"],
            ],
            [
                ["PC_M1", "PC_M2", "PC_M3", "PC_M4"],
                ["PC_M5", "PC_M6", "PD_M1", "PD_M2"],
                ["PD_M3", "PD_M4", "PD_M5", "PD_M6"],
            ],
            tableau_final_16,
        ]

    elif nb_jours == 2:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
            ],
            tableau_final_16,
        ]

    else:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
                *tableau_final_16,
            ],
        ]

    for jour_index, vagues in enumerate(blocs):
        ordre_planning = _programmer_bloc_jour(
            matchs_by_code=matchs_by_code,
            vagues=vagues,
            jour_index=jour_index,
            heures_debut_jours=heures_debut_jours,
            heure_debut=heure_debut,
            duree_match=duree_match,
            terrains=terrains,
            compteur_terrains=compteur_terrains,
            ordre_planning=ordre_planning,
            terrain_principal=terrain_principal,
        )

    return matchs

def _planning_32_poules(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal,
    nb_jours=1,
    heures_debut_jours=None,
):
    matchs_by_code = _matchs_par_code(matchs)
    compteur_terrains = _compteur_terrains(terrains)
    ordre_planning = 1
    heures_debut_jours = heures_debut_jours or [heure_debut]

    tableau_final_16 = [
        ["H1", "H2", "H3", "H4"],
        ["H5", "H6", "H7", "H8"],
        ["C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4"],
        ["Q1", "Q2", "Q3", "Q4"],
        ["C13_16_1", "C13_16_2", "C9_12_1", "C9_12_2"],
        ["D1", "D2", "C5_8_1", "C5_8_2"],
        ["C15_16", "C13_14", "C11_12", "C9_10"],
        ["C7_8", "C5_6", "PF", "F"],
    ]

    if nb_jours == 3:
        blocs = [
            [
                ["PA_M1", "PA_M2", "PA_M3", "PA_M4"],
                ["PA_M5", "PA_M6", "PA_M7", "PA_M8"],
                ["PA_M9", "PA_M10", "PB_M1", "PB_M2"],
                ["PB_M3", "PB_M4", "PB_M5", "PB_M6"],
                ["PB_M7", "PB_M8", "PB_M9", "PB_M10"],
            ],
            [
                ["PC_M1", "PC_M2", "PC_M3", "PC_M4"],
                ["PC_M5", "PC_M6", "PC_M7", "PC_M8"],
                ["PC_M9", "PC_M10", "PD_M1", "PD_M2"],
                ["PD_M3", "PD_M4", "PD_M5", "PD_M6"],
                ["PD_M7", "PD_M8", "PD_M9", "PD_M10"],
            ],
            tableau_final_16,
        ]

    elif nb_jours == 2:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
                ["PA_M7", "PB_M7", "PC_M7", "PD_M7"],
                ["PA_M8", "PB_M8", "PC_M8", "PD_M8"],
                ["PA_M9", "PB_M9", "PC_M9", "PD_M9"],
                ["PA_M10", "PB_M10", "PC_M10", "PD_M10"],
            ],
            tableau_final_16,
        ]

    else:
        blocs = [
            [
                ["PA_M1", "PB_M1", "PC_M1", "PD_M1"],
                ["PA_M2", "PB_M2", "PC_M2", "PD_M2"],
                ["PA_M3", "PB_M3", "PC_M3", "PD_M3"],
                ["PA_M4", "PB_M4", "PC_M4", "PD_M4"],
                ["PA_M5", "PB_M5", "PC_M5", "PD_M5"],
                ["PA_M6", "PB_M6", "PC_M6", "PD_M6"],
                ["PA_M7", "PB_M7", "PC_M7", "PD_M7"],
                ["PA_M8", "PB_M8", "PC_M8", "PD_M8"],
                ["PA_M9", "PB_M9", "PC_M9", "PD_M9"],
                ["PA_M10", "PB_M10", "PC_M10", "PD_M10"],
                *tableau_final_16,
            ],
        ]

    for jour_index, vagues in enumerate(blocs):
        ordre_planning = _programmer_bloc_jour(
            matchs_by_code=matchs_by_code,
            vagues=vagues,
            jour_index=jour_index,
            heures_debut_jours=heures_debut_jours,
            heure_debut=heure_debut,
            duree_match=duree_match,
            terrains=terrains,
            compteur_terrains=compteur_terrains,
            ordre_planning=ordre_planning,
            terrain_principal=terrain_principal,
        )

    return matchs

def _decoupage_jours(
    matchs_tries,
    nb_equipes,
    mode_tournoi,
    nb_jours,
):
    groupes = []

    # ==========================
    # ELIMINATION DIRECTE
    # ==========================

    if mode_tournoi == "Élimination directe" and nb_equipes == 20:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:22],
                matchs_tries[22:40],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:14],
                matchs_tries[14:28],
                matchs_tries[28:40],
            ]

    elif mode_tournoi == "Élimination directe" and nb_equipes == 24:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:28],
                matchs_tries[28:52],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:20],
                matchs_tries[20:38],
                matchs_tries[38:52],
            ]

    elif mode_tournoi == "Élimination directe" and nb_equipes == 32:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:48],
                matchs_tries[48:80],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:32],
                matchs_tries[32:52],
                matchs_tries[52:80],
            ]

    # ==========================
    # POULES + TABLEAU FINAL
    # ==========================

    elif mode_tournoi == "Poules + tableau final" and nb_equipes == 20:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:24],
                matchs_tries[24:36],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:12],
                matchs_tries[12:24],
                matchs_tries[24:36],
            ]

    elif mode_tournoi == "Poules + tableau final" and nb_equipes == 24:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:24],
                matchs_tries[24:56],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:12],
                matchs_tries[12:24],
                matchs_tries[24:56],
            ]

    elif mode_tournoi == "Poules + tableau final" and nb_equipes == 32:

        if nb_jours == 2:
            groupes = [
                matchs_tries[0:40],
                matchs_tries[40:72],
            ]

        elif nb_jours == 3:
            groupes = [
                matchs_tries[0:20],
                matchs_tries[20:40],
                matchs_tries[40:72],
            ]

    return groupes


def _recaler_heures_par_jour(
    groupes,
    heures_debut_jours,
    duree_match,
    terrains,
):
    for jour, groupe in enumerate(groupes):

        heure = _datetime_heure(
            heures_debut_jours[
                min(jour, len(heures_debut_jours) - 1)
            ]
        )

        index = 0

        while index < len(groupe):

            creneau = groupe[index:index + len(terrains)]

            for match in creneau:
                match.heure = _format_heure(heure)
                match.jour = jour + 1

            heure = _ajouter_minutes(
                heure,
                duree_match,
            )

            index += len(terrains)


def ajouter_planning(
    matchs,
    terrains,
    heure_debut,
    duree_match,
    terrain_principal=None,
    nb_jours=1,
    heures_debut_jours=None,
):

    if heures_debut_jours is None:
        heures_debut_jours = [heure_debut]

    nb_equipes = max(
        len(
            {
                e.ts
                for m in matchs
                for e in [m.equipe1, m.equipe2]
                if not isinstance(e, str)
            }
        ),
        8,
    )

    mode_tournoi = (
        "Poules + tableau final"
        if any(
            m.code.startswith("PA_")
            for m in matchs
        )
        else "Élimination directe"
    )

    if mode_tournoi == "Poules + tableau final":

        if nb_equipes == 20:
            matchs = _planning_20_poules(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
                nb_jours,
                heures_debut_jours,
            )

        elif nb_equipes == 24:
            matchs = _planning_24_poules(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
                nb_jours,
                heures_debut_jours,
            )

        elif nb_equipes == 32:
            matchs = _planning_32_poules(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
                nb_jours,
                heures_debut_jours,
            )

    else:

        if nb_equipes == 8:
            matchs = _planning_8(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

        elif nb_equipes == 12:
            matchs = _planning_12(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

        elif nb_equipes == 16:
            matchs = _planning_16(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

        elif nb_equipes == 20:
            matchs = _planning_20(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

        elif nb_equipes == 24:
            matchs = _planning_24(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

        elif nb_equipes == 32:
            matchs = _planning_32(
                matchs,
                terrains,
                heure_debut,
                duree_match,
                terrain_principal,
            )

    matchs_tries = _trier_matchs(matchs)

    groupes = _decoupage_jours(
        matchs_tries,
        nb_equipes,
        mode_tournoi,
        nb_jours,
    )

    if groupes:
        _recaler_heures_par_jour(
            groupes,
            heures_debut_jours,
            duree_match,
            terrains,
        )

    return matchs