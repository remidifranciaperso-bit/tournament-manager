"""Appel Engine V2 pour regénérer un PDF depuis snapshot + captures."""

from __future__ import annotations

import base64

import httpx

from api.platform.config import ENGINE_V2_URL


def regenerate_pdf_via_engine(snapshot: dict) -> tuple[bytes, dict]:
    captures = snapshot.get("export_captures")
    if not isinstance(captures, dict) or not captures:
        raise ValueError(
            "Ce tournoi ne peut pas être regénéré (captures Live absentes). "
            "Recréez-le depuis Nouveau tournoi."
        )

    url = f"{ENGINE_V2_URL.rstrip('/')}/api/v2/regenerate-from-snapshot"
    with httpx.Client(timeout=180.0) as client:
        response = client.post(
            url,
            json={"snapshot": snapshot, "captures": captures},
        )
        response.raise_for_status()
        payload = response.json()

    pdf_b64 = payload.get("pdf_base64")
    refreshed = payload.get("snapshot")
    if not pdf_b64 or not isinstance(refreshed, dict):
        raise ValueError("Réponse Engine V2 invalide.")

    return base64.b64decode(pdf_b64), refreshed
