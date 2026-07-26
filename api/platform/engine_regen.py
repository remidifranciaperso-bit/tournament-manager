"""Appel Engine V2 pour regénérer un PDF depuis snapshot + captures."""

from __future__ import annotations

import base64
import copy
import time

import httpx

from api.platform.config import ENGINE_V2_URL

_PATCH_KEYS = ("fields", "matches", "equipes", "meta", "page_map", "planning_layout", "logo_png")

# Captures Live figées (tableau, planning…) — invalidées après changement d'équipe / TS.
_STALE_CAPTURE_PREFIXES = ("main:", "classement:", "planning:", "composition:", "final:")


def invalidate_team_content_captures(snapshot: dict) -> None:
    """Force la regénération tableau / planning depuis le snapshot (pas les captures DOM)."""
    captures = snapshot.get("export_captures")
    if isinstance(captures, dict):
        snapshot["export_captures"] = {
            key: value
            for key, value in captures.items()
            if not key.startswith(_STALE_CAPTURE_PREFIXES)
        }

    stubs = snapshot.get("crosspage_stubs")
    if isinstance(stubs, dict):
        snapshot["crosspage_stubs"] = {
            key: value
            for key, value in stubs.items()
            if not key.startswith(_STALE_CAPTURE_PREFIXES)
        }


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
    payload = {"snapshot": slim_snapshot, "captures": captures}
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

    return base64.b64decode(pdf_b64), _merge_snapshot_patch(snapshot, patch)


def regenerate_pdf_via_engine(snapshot: dict) -> tuple[bytes, dict]:
    captures = _extract_captures(snapshot)
    return _regenerate_pdf_remote(snapshot, captures)
