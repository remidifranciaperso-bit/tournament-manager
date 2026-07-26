"""Appel Engine V2 pour regénérer un PDF depuis snapshot + captures."""

from __future__ import annotations

import base64
import copy
import time
from typing import TYPE_CHECKING, Any

import httpx

from api.platform.config import ENGINE_V2_URL

if TYPE_CHECKING:
    from api.platform.models import ClubProfile

_PATCH_KEYS = ("fields", "matches", "equipes", "meta", "page_map", "planning_layout", "logo_png")


def club_logo_png_b64(profile: ClubProfile | None) -> str | None:
    if profile is None or not profile.logo_data or len(profile.logo_data) < 64:
        return None
    return base64.b64encode(profile.logo_data).decode("ascii")


def attach_club_logo_to_snapshot(snapshot: dict[str, Any], profile: ClubProfile | None) -> None:
    existing = snapshot.get("logo_png")
    if isinstance(existing, str) and existing.strip():
        return
    encoded = club_logo_png_b64(profile)
    if encoded:
        snapshot["logo_png"] = encoded


def _extract_captures(snapshot: dict) -> dict[str, str]:
    captures = snapshot.get("export_captures")
    if not isinstance(captures, dict) or not captures:
        raise ValueError(
            "Ce tournoi ne peut pas être regénéré (captures Live absentes). "
            "Recréez-le depuis Nouveau tournoi."
        )
    return captures


def _slim_snapshot_for_remote(snapshot: dict) -> dict:
    slim = copy.deepcopy(snapshot)
    slim.pop("export_captures", None)
    slim.pop("crosspage_stubs", None)
    return slim


def _wake_engine(client: httpx.Client) -> None:
    try:
        client.get(f"{ENGINE_V2_URL.rstrip('/')}/api/v2/health")
    except httpx.HTTPError:
        pass


def _merge_snapshot_patch(snapshot: dict, patch: dict) -> dict:
    merged = copy.deepcopy(snapshot)
    for key in _PATCH_KEYS:
        if key in patch:
            merged[key] = patch[key]
    return merged


def _regenerate_pdf_remote(snapshot: dict, captures: dict[str, str]) -> tuple[bytes, dict]:
    slim_snapshot = _slim_snapshot_for_remote(snapshot)
    url = f"{ENGINE_V2_URL.rstrip('/')}/api/v2/regenerate-from-snapshot"
    timeout = httpx.Timeout(300.0, connect=90.0)
    payload: dict[str, Any] = {"snapshot": slim_snapshot, "captures": captures}
    logo_png = snapshot.get("logo_png")
    if isinstance(logo_png, str) and logo_png.strip():
        payload["logo_png"] = logo_png
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            with httpx.Client(timeout=timeout) as client:
                if attempt == 0:
                    _wake_engine(client)
                response = client.post(url, json=payload)
                response.raise_for_status()
                body = response.json()
            break
        except (httpx.RemoteProtocolError, httpx.ReadError, httpx.WriteError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(2.0)
                continue
            raise
    else:
        assert last_error is not None
        raise last_error

    pdf_b64 = body.get("pdf_base64")
    if not pdf_b64:
        raise ValueError("Réponse Engine V2 invalide (PDF absent).")

    patch = body.get("snapshot")
    if not isinstance(patch, dict):
        patch = {key: body[key] for key in _PATCH_KEYS if key in body}

    merged = _merge_snapshot_patch(snapshot, patch)
    if isinstance(snapshot.get("logo_png"), str) and snapshot["logo_png"].strip():
        merged["logo_png"] = snapshot["logo_png"]
    return base64.b64decode(pdf_b64), merged


def regenerate_pdf_via_engine(snapshot: dict) -> tuple[bytes, dict]:
    captures = _extract_captures(snapshot)
    return _regenerate_pdf_remote(snapshot, captures)
