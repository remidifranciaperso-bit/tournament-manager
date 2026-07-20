from dataclasses import dataclass, field
from typing import Any


@dataclass
class Match:
    ordre: int
    code: str
    tour: str
    equipe1: Any
    equipe2: Any

    terrain: str | None = None
    heure: str | None = None
    parents: list[str] = field(default_factory=list)

    def equipe1_label(self):
        if isinstance(self.equipe1, str):
            return self.equipe1
        return self.equipe1.nom_complet_court()

    def equipe2_label(self):
        if isinstance(self.equipe2, str):
            return self.equipe2
        return self.equipe2.nom_complet_court()

    def label(self):
        return f"{self.code} - {self.tour}"