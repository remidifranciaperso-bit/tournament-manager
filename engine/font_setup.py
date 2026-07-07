import os
import shutil
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path


def _dossier_polices_projet(base_dir: Path | None = None) -> Path:
    if base_dir is not None:
        candidat = Path(base_dir) / "fonts"
        if candidat.is_dir():
            return candidat.resolve()

    ici = Path(__file__).resolve().parent.parent / "fonts"
    if ici.is_dir():
        return ici.resolve()

    raise FileNotFoundError("Dossier fonts/ introuvable (Grindy Brush, TSL Sans).")


def _copier_polices_normalisees(source: Path, cible: Path) -> None:
    cible.mkdir(parents=True, exist_ok=True)

    correspondances = {
        "Grindy Brush.otf": "GrindyBrush.otf",
        "TSLSans.ttf": "TSLSans.ttf",
    }

    for nom_source, nom_cible in correspondances.items():
        fichier = source / nom_source
        if fichier.is_file():
            shutil.copy2(fichier, cible / nom_cible)


def _rafraichir_cache_fontconfig(font_dir: Path) -> None:
    if sys.platform == "win32":
        return

    fc_cache = shutil.which("fc-cache")
    if not fc_cache:
        return

    try:
        subprocess.run(
            [fc_cache, "-f", str(font_dir)],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=30,
        )
    except (subprocess.SubprocessError, OSError):
        pass


@contextmanager
def environnement_polices_tournoi(base_dir: Path | None = None):
    """
    Rend les polices tournoi visibles pour LibreOffice (SAL_FONTPATH + fontconfig).
    """
    source = _dossier_polices_projet(base_dir)
    temp_dir = Path(tempfile.mkdtemp(prefix="tournament_fonts_"))
    sauvegardes: dict[str, str | None] = {}

    try:
        _copier_polices_normalisees(source, temp_dir)
        _rafraichir_cache_fontconfig(temp_dir)

        for cle in ("SAL_FONTPATH", "FONTCONFIG_PATH"):
            sauvegardes[cle] = os.environ.get(cle)

        chemins = [str(temp_dir)]
        existant = os.environ.get("SAL_FONTPATH", "").strip()
        if existant:
            chemins.insert(0, existant)

        os.environ["SAL_FONTPATH"] = os.pathsep.join(chemins)
        os.environ["FONTCONFIG_PATH"] = str(temp_dir)

        yield temp_dir
    finally:
        for cle, valeur in sauvegardes.items():
            if valeur is None:
                os.environ.pop(cle, None)
            else:
                os.environ[cle] = valeur

        shutil.rmtree(temp_dir, ignore_errors=True)
