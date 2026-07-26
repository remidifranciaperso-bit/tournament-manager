"""Initialisation Live V2 via Engine V2 (snapshot JSON Platform, PDF récupéré côté Engine)."""

from __future__ import annotations

import time
from uuid import UUID

import httpx

from api.platform.config import ENGINE_V2_URL
from api.platform.engine_access import create_live_pdf_token


def _slim_snapshot_for_live(snapshot: dict, pdf_filename: str) -> dict:
    slim = {
        key: value
        for key, value in snapshot.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    slim.setdefault("version", "engine-v2-live-capture-1")
    slim.setdefault("pdf_filename", pdf_filename)
    return slim


def _wake_engine(client: httpx.Client) -> None:
    try:
        client.get(f"{ENGINE_V2_URL.rstrip('/')}/api/v2/health")
    except httpx.HTTPError:
        pass


def init_live_from_platform_snapshot(
    *,
    platform_base_url: str,
    tournament_id: UUID,
    snapshot: dict,
    pdf_filename: str,
) -> dict:
    """Envoie uniquement le snapshot JSON ; Engine V2 télécharge le PDF depuis Platform."""
    token = create_live_pdf_token(tournament_id)
    pdf_url = (
        f"{platform_base_url.rstrip('/')}/api/platform/engine/tournaments/{tournament_id}/pdf"
        f"?token={token}"
    )
    slim_snapshot = _slim_snapshot_for_live(snapshot, pdf_filename)
    payload: dict = {
        "snapshot": slim_snapshot,
        "pdf_url": pdf_url,
    }
    logo_png = snapshot.get("logo_png")
    if isinstance(logo_png, str) and logo_png.strip():
        payload["logo_png"] = logo_png

    url = f"{ENGINE_V2_URL.rstrip('/')}/api/v2/live-init-from-snapshot"
    timeout = httpx.Timeout(300.0, connect=90.0)
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            with httpx.Client(timeout=timeout) as client:
                if attempt == 0:
                    _wake_engine(client)
                response = client.post(url, json=payload)
                response.raise_for_status()
                body = response.json()
            if not isinstance(body, dict) or not body.get("live_token"):
                raise ValueError("Réponse Live V2 invalide (live_token absent).")
            return body
        except (httpx.RemoteProtocolError, httpx.ReadError, httpx.WriteError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(2.0)
                continue
            raise
    if last_error is not None:
        raise last_error
    raise RuntimeError("Live init impossible.")
