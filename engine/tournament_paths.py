"""Chemins templates / noms export — sans dépendance pandas (Platform PDF regen)."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path


def nettoyer_nom_fichier(texte: str) -> str:
    texte = str(texte).strip()
    texte = texte.replace("/", "-")
    texte = re.sub(r"[^A-Za-z0-9À-ÿ_-]+", "-", texte)
    return texte.strip("-")


def format_date_fichier(date_tournoi: str) -> str:
    try:
        return datetime.strptime(str(date_tournoi), "%Y-%m-%d").strftime("%d-%m-%y")
    except Exception:
        return nettoyer_nom_fichier(date_tournoi)


def construire_nom_export(type_tournoi: str, club: str, date_tournoi: str) -> str:
    return (
        f"{nettoyer_nom_fichier(type_tournoi)}-"
        f"{nettoyer_nom_fichier(club)}-"
        f"{format_date_fichier(date_tournoi)}"
    )


def verifier_template_existe(template_path: Path) -> None:
    if not template_path.exists():
        raise FileNotFoundError(f"Template introuvable : {template_path}")


def chemin_template(tournoi, base_dir) -> Path:
    if tournoi.mode_tournoi == "Poules + tableau final":
        template_nom = f"Template_{tournoi.nb_equipes}_poules_{tournoi.nb_jours}J.pptx"
    else:
        template_nom = f"Template_{tournoi.nb_equipes}_{tournoi.nb_jours}J.pptx"

    template_path = Path(base_dir) / "templates bleus" / template_nom
    verifier_template_existe(template_path)
    return template_path
