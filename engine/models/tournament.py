from dataclasses import dataclass, field
from engine.models.team import Team


@dataclass
class Tournament:
    club: str
    date_tournoi: str
    type_tournoi: str

    equipes: list[Team]

    heure_debut: str = "18:00"
    duree_match: int = 40

    terrains: list[str] = field(default_factory=list)
    terrain_principal: str = "Terrain 1"

    mode_tournoi: str = "Élimination directe"
    nb_jours: int = 1
    heures_debut_jours: list[str] = field(default_factory=lambda: ["18:00"])

    matches: list = field(default_factory=list)
    planning: list = field(default_factory=list)

    def __post_init__(self):
        if not self.terrains:
            self.terrains = ["Terrain 1"]

        if self.terrain_principal not in self.terrains:
            self.terrain_principal = self.terrains[0]

    @property
    def nb_equipes(self):
        return len(self.equipes)

    @property
    def nb_terrains(self):
        return len(self.terrains)

    def resume(self):
        return {
            "club": self.club,
            "date": self.date_tournoi,
            "type": self.type_tournoi,
            "nb_equipes": self.nb_equipes,
            "heure_debut": self.heure_debut,
            "duree_match": self.duree_match,
            "terrains": self.terrains,
            "nb_terrains": self.nb_terrains,
            "terrain_principal": self.terrain_principal,
            "mode_tournoi": self.mode_tournoi,
            "nb_jours": self.nb_jours,
            "heures_debut_jours": self.heures_debut_jours,
        }