from pathlib import Path

from pptx import Presentation

from engine.live_valeurs import construire_valeurs_masque_template
from engine.ppt_engine import (
    redresser_connecteurs,
    remplacer_balises,
    supprimer_ombres_theme,
)


def preparer_pptx_masque(template_path: Path, output_path: Path) -> Path:
    """
    PPTX intermédiaire pour export PNG : graphismes + titres brush,
    placeholders dynamiques vidés, libellés WIN_/LOSE_ conservés.
    """
    prs = Presentation(str(template_path))
    valeurs = construire_valeurs_masque_template(template_path)

    redresser_connecteurs(prs)
    supprimer_ombres_theme(prs)
    remplacer_balises(prs, valeurs)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(output_path))
    return output_path


def chemin_masque_png(base_dir: Path, template_id: str, slide_index: int) -> Path:
    return (
        base_dir
        / "frontend"
        / "public"
        / "live-templates"
        / template_id
        / f"{slide_index}.png"
    )


def masques_disponibles(base_dir: Path, template_id: str, indices: list[int]) -> bool:
    return all(
        chemin_masque_png(base_dir, template_id, index).exists()
        for index in indices
    )
