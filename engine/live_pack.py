"""Import d'un pack Manager Live (ZIP Engine : PDF + snapshot .live.json)."""

from __future__ import annotations

import json
import shutil
import tempfile
import zipfile
from pathlib import Path

from engine.live_snapshot import SNAPSHOT_VERSION

_CHAMPS_SNAPSHOT = (
    "version",
    "pdf_filename",
    "meta",
    "matches",
    "fields",
    "page_map",
)


def valider_snapshot(snapshot: dict) -> None:
    if snapshot.get("version") != SNAPSHOT_VERSION:
        raise ValueError(
            "Snapshot incompatible. Regénérez le pack avec la dernière version Engine."
        )

    for cle in _CHAMPS_SNAPSHOT:
        if cle not in snapshot:
            raise ValueError(f"Snapshot incomplet : champ « {cle} » manquant.")

    page_map = snapshot.get("page_map") or {}
    if not page_map.get("main") and not page_map.get("classement"):
        raise ValueError("Snapshot invalide : aucune page tableau cartographiée.")


def extraire_pack_manager_live(archive_path: Path) -> tuple[Path, dict, Path]:
    """
    Extrait PDF + snapshot depuis une archive ZIP.
    Retourne (chemin_pdf, snapshot, dossier_temporaire_a_nettoyer).
    """
    archive_path = Path(archive_path)
    if not archive_path.is_file():
        raise ValueError("Archive introuvable.")

    temp_dir = Path(tempfile.mkdtemp(prefix="manager-live-pack-"))

    try:
        with zipfile.ZipFile(archive_path) as zf:
            entrees = [
                nom
                for nom in zf.namelist()
                if not nom.startswith("__MACOSX/")
                and not nom.endswith("/")
            ]
            pdfs = [nom for nom in entrees if nom.lower().endswith(".pdf")]
            snapshots = [
                nom for nom in entrees if nom.lower().endswith(".live.json")
            ]

            if len(pdfs) != 1:
                raise ValueError(
                    "Le pack doit contenir exactement un fichier PDF Engine."
                )
            if len(snapshots) != 1:
                raise ValueError(
                    "Le pack doit contenir exactement un fichier .live.json."
                )

            pdf_nom = pdfs[0]
            snapshot_nom = snapshots[0]

            pdf_sortie = temp_dir / Path(pdf_nom).name
            snapshot_sortie = temp_dir / Path(snapshot_nom).name

            with zf.open(pdf_nom) as source, pdf_sortie.open("wb") as cible:
                shutil.copyfileobj(source, cible)
            with zf.open(snapshot_nom) as source, snapshot_sortie.open("wb") as cible:
                shutil.copyfileobj(source, cible)

        try:
            snapshot = json.loads(
                snapshot_sortie.read_text(encoding="utf-8")
            )
        except json.JSONDecodeError as exc:
            raise ValueError(f"Snapshot illisible : {exc}") from exc

        valider_snapshot(snapshot)
        return pdf_sortie, snapshot, temp_dir
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
