from dataclasses import dataclass


@dataclass
class Team:
    numero: int
    ts: int

    joueur1: str
    classement_j1: int

    joueur2: str
    classement_j2: int

    poids: int

    def nom(self):
        return f"{self.joueur1} / {self.joueur2}"

    def ts_label(self):
        return f"TS{self.ts}"

    def nom_complet(self):
        return f"{self.nom()} ({self.ts_label()})"

    def _nom_court_joueur(self, joueur):
        morceaux = joueur.split(" ", 1)

        if len(morceaux) == 1:
            return joueur

        prenom = morceaux[0]
        nom = morceaux[1]

        return f"{prenom[0].upper()}. {nom}"

    def nom_court(self):
        return f"{self._nom_court_joueur(self.joueur1)} / {self._nom_court_joueur(self.joueur2)}"

    def nom_complet_court(self):
        return f"{self.nom_court()} ({self.ts_label()})"