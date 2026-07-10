from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import time


# Ordre de recherche des binaires LibreOffice (Linux, macOS, Windows).
_SOFFICE_CANDIDATS = [
    "soffice",
    "libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/opt/libreoffice/program/soffice",
    r"C:\Program Files\LibreOffice\program\soffice.exe",
]


def trouver_soffice():
    """Renvoie le chemin d'un binaire LibreOffice utilisable, sinon None."""

    binaire_env = os.environ.get("SOFFICE_BIN")
    if binaire_env and Path(binaire_env).exists():
        return binaire_env

    for candidat in _SOFFICE_CANDIDATS:
        chemin = shutil.which(candidat)
        if chemin:
            return chemin

        if os.path.isfile(candidat) and os.access(candidat, os.X_OK):
            return candidat

    return None


def _environnement_libreoffice_silencieux():
    env = os.environ.copy()
    env["SAL_USE_VCLPLUGIN"] = "svp"
    env.setdefault("LANG", "C.UTF-8")
    return env


def _executer_libreoffice(commande: list[str], timeout: int = 180) -> subprocess.CompletedProcess:
    """
    Lance LibreOffice sans fenêtre ni bruit terminal si possible.
    """
    kwargs = {
        "check": True,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.PIPE,
        "stdin": subprocess.DEVNULL,
        "timeout": timeout,
        "env": _environnement_libreoffice_silencieux(),
    }

    if sys.platform != "win32":
        kwargs["start_new_session"] = True

    try:
        return subprocess.run(commande, **kwargs)
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            "La conversion via LibreOffice a dépassé le délai imparti."
        )
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.decode("utf-8", errors="replace") if exc.stderr else ""
        raise RuntimeError(
            "Échec de la conversion via LibreOffice.\n"
            f"Erreur : {detail}"
        )


def _options_export_pdf_impress():
    """Réduit la RAM LibreOffice sur hébergement 512 Mo (Render starter)."""
    if os.environ.get("RENDER_LOW_MEMORY", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    ):
        return (
            '"ReduceImageResolution":{"type":"boolean","value":"true"},'
            '"MaxImageResolution":{"type":"long","value":"150"}'
        )
    return (
        '"ReduceImageResolution":{"type":"boolean","value":"false"},'
        '"MaxImageResolution":{"type":"long","value":"600"}'
    )


def convertir_avec_libreoffice(pptx_path, output_dir, soffice_bin, format_sortie="pdf"):
    """
    Conversion PPTX -> PDF (ou autre) via LibreOffice en mode headless/invisible.
    """

    pptx_path = Path(pptx_path)
    output_dir = Path(output_dir)
    suffix = "pdf" if format_sortie == "pdf" else format_sortie
    fichier_sortie = output_dir / f"{pptx_path.stem}.{suffix}"

    with tempfile.TemporaryDirectory(prefix="lo_profile_") as profil_tmp:
        user_installation = Path(profil_tmp).as_uri()

        commande = [
            soffice_bin,
            "--headless",
            "--invisible",
            "--nodefault",
            "--nolockcheck",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            f"-env:UserInstallation={user_installation}",
            "--convert-to",
            (
                "pdf:impress_pdf_Export:"
                "{"
                '"SelectPdfVersion":{"type":"long","value":"1"},'
                '"Quality":{"type":"long","value":"90"},'
                + _options_export_pdf_impress()
                + "}"
            ),
            "--outdir",
            str(output_dir),
            str(pptx_path),
        ]

        _executer_libreoffice(commande)

    if not fichier_sortie.exists():
        raise RuntimeError(
            f"Fichier non généré par LibreOffice : {fichier_sortie}"
        )

    return fichier_sortie


def convertir_avec_powerpoint_macos(pptx_path, output_dir):
    """
    Conversion PPTX -> PDF via Microsoft PowerPoint (macOS uniquement).

    Conservé comme repli pour le développement local sur Mac lorsque
    LibreOffice n'est pas installé.
    """

    pdf_path = output_dir / f"{pptx_path.stem}.pdf"

    script = f'''
    set pptxFile to POSIX file "{pptx_path}"
    set pdfFile to POSIX file "{pdf_path}"

    tell application "Microsoft PowerPoint"
        set visible of application "Microsoft PowerPoint" to false
        open pptxFile
        delay 1

        set pres to active presentation
        save pres in pdfFile as save as PDF

        close pres saving no
    end tell
    '''

    subprocess.run(
        ["osascript", "-e", script],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )

    time.sleep(1)

    if not pdf_path.exists():
        raise RuntimeError(f"PDF non généré : {pdf_path}")

    return pdf_path


def convertir_pptx_en_pdf(pptx_path, output_dir):
    """
    Convertit un PowerPoint en PDF de manière portable.

    Stratégie :
      1. LibreOffice headless/invisible (par défaut, fonctionne en ligne / Linux).
      2. Repli sur Microsoft PowerPoint via AppleScript (macOS local).

    La variable d'environnement PDF_CONVERTER permet de forcer un moteur :
      - PDF_CONVERTER=libreoffice
      - PDF_CONVERTER=powerpoint
    """

    pptx_path = Path(pptx_path).resolve()
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not pptx_path.exists():
        raise FileNotFoundError(f"PowerPoint introuvable : {pptx_path}")

    moteur_force = os.environ.get("PDF_CONVERTER", "").strip().lower()

    if moteur_force == "powerpoint":
        return convertir_avec_powerpoint_macos(pptx_path, output_dir)

    soffice_bin = trouver_soffice()

    if moteur_force == "libreoffice" or soffice_bin:
        if not soffice_bin:
            raise RuntimeError(
                "PDF_CONVERTER=libreoffice mais aucun binaire LibreOffice "
                "n'a été trouvé. Installez LibreOffice ou définissez SOFFICE_BIN."
            )
        return convertir_avec_libreoffice(pptx_path, output_dir, soffice_bin)

    if sys.platform == "darwin":
        return convertir_avec_powerpoint_macos(pptx_path, output_dir)

    raise RuntimeError(
        "Aucun moteur de conversion PDF disponible.\n"
        "Installez LibreOffice (recommandé pour le déploiement en ligne) "
        "ou, sur macOS, Microsoft PowerPoint."
    )
