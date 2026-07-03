from engine.placement_engine import (
    construire_bracket_8,
    construire_bracket_12,
    construire_bracket_16,
    construire_bracket_20,
    construire_bracket_24,
    construire_bracket_32,
)

from engine.pool_engine import (
    construire_bracket_20_poules,
    construire_bracket_24_poules,
    construire_bracket_32_poules,
)


def generer_tableau(tournoi, seed=None):
    if tournoi.mode_tournoi == "Poules + tableau final":
        methode_poules = getattr(
            tournoi,
            "methode_poules",
            "Méthode du serpentin",
        )

        if tournoi.nb_equipes == 20:
            matchs, exemptes, poules = construire_bracket_20_poules(
                tournoi.equipes,
                seed=seed,
                methode=methode_poules,
            )
            tournoi.matches = matchs
            tournoi.exemptes = exemptes
            tournoi.poules = poules
            return tournoi.matches

        if tournoi.nb_equipes == 24:
            matchs, exemptes, poules = construire_bracket_24_poules(
                tournoi.equipes,
                seed=seed,
                methode=methode_poules,
            )
            tournoi.matches = matchs
            tournoi.exemptes = exemptes
            tournoi.poules = poules
            return tournoi.matches

        if tournoi.nb_equipes == 32:
            matchs, exemptes, poules = construire_bracket_32_poules(
                tournoi.equipes,
                seed=seed,
                methode=methode_poules,
            )
            tournoi.matches = matchs
            tournoi.exemptes = exemptes
            tournoi.poules = poules
            return tournoi.matches

        raise ValueError(
            "Le mode 'Poules + tableau final' est disponible uniquement "
            "pour 20, 24 et 32 équipes pour l'instant."
        )

    if tournoi.nb_equipes == 8:
        tournoi.matches = construire_bracket_8(tournoi.equipes, seed=seed)
        return tournoi.matches

    if tournoi.nb_equipes == 12:
        tournoi.matches = construire_bracket_12(tournoi.equipes, seed=seed)
        return tournoi.matches

    if tournoi.nb_equipes == 16:
        tournoi.matches = construire_bracket_16(tournoi.equipes, seed=seed)
        return tournoi.matches

    if tournoi.nb_equipes == 20:
        tournoi.matches = construire_bracket_20(tournoi.equipes, seed=seed)
        return tournoi.matches

    if tournoi.nb_equipes == 24:
        tournoi.matches = construire_bracket_24(tournoi.equipes, seed=seed)
        return tournoi.matches

    if tournoi.nb_equipes == 32:
        tournoi.matches = construire_bracket_32(tournoi.equipes, seed=seed)
        return tournoi.matches

    raise ValueError(
        f"Nombre d'équipes non supporté : {tournoi.nb_equipes}"
    )

def afficher_matchs(matchs):
    print("\n============================")
    print("TABLEAU DU TOURNOI")
    print("============================\n")

    for match in matchs:
        print(match.label())
        print(match.equipe1_label())
        print("vs")
        print(match.equipe2_label())
        print("-" * 30)