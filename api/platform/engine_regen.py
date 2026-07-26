"""Regénération PDF depuis snapshot Platform (+ captures stockées)."""

from __future__ import annotations

import base64
import copy
from pathlib import Path

import httpx

from api.platform.config import ENGINE_V2_URL

_BASE_DIR = Path(__file__).resolve().parents[2]


def _extract_captures(snapshot: dict) -> dict[str, str]:
    captures = snapshot.get("export_captures")
    if not isinstance(captures, dict) or not captures:
        raise ValueError(
            "Ce tournoi ne peut pas être regénéré (captures Live absentes). "
            "Recréez-le depuis Nouveau tournoi."
        )
    return captures


def _regenerate_pdf_local(snapshot: dict, captures: dict[str, str]) -> tuple[bytes, dict]:
    from engine_v2.snapshot_regen import regenerate_pdf_from_snapshot

    return regenerate_pdf_from_snapshot(snapshot, captures, base_dir=_BASE_DIR)


def _regenerate_pdf_remote(snapshot: dict, captures: dict[str, str]) -> tuple[bytes, dict]:
    slim_snapshot = copy.deepcopy(snapshot)
    slim_snapshot.pop("export_captures", None)
    slim_snapshot.pop("crosspage_stubs", None)

    url = f"{ENGINE_V2_URL.rstrip('/')}/api/v2/regenerate-from-snapshot"
    timeout = httpx.Timeout(300.0, connect=60.0)
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            url,
            json={"snapshot": slim_snapshot, "captures": captures},
        )
        response.raise_for_status()
        payload = response.json()

    pdf_b64 = payload.get("pdf_base64")
    if not pdf_b64:
        raise ValueError("Réponse Engine V2 invalide (PDF absent).")

    refreshed = payload.get("snapshot")
    if not isinstance(refreshed, dict):
        refreshed = {}
        for key in ("fields", "matches", "equipes", "meta"):
            if key in payload:
                refreshed[key] = payload[key]

    merged = copy.deepcopy(snapshot)
    for key in ("fields", "matches", "equipes", "meta"):
        if key in refreshed:
            merged[key] = refreshed[key]
    if snapshot.get("export_captures"):
        merged["export_captures"] = snapshot["export_captures"]
    if snapshot.get("crosspage_stubs"):
        merged["crosspage_stubs"] = snapshot["crosspage_stubs"]

    return base64.b64decode(pdf_b64), merged


def regenerate_pdf_via_engine(snapshot: dict) -> tuple[bytes, dict]:
    captures = _extract_captures(snapshot)

    try:
        return _regenerate_pdf_local(snapshot, captures)
    except ImportError:
        pass
    except (ValueError, RuntimeError, FileNotFoundError) as exc:
        raise ValueError(str(exc)) from exc

    return _regenerate_pdf_remote(snapshot, captures)
