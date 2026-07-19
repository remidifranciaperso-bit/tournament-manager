"""Titres de bandeau PDF (alignés Live / templates Engine V1)."""

from __future__ import annotations

import re

_PARTIE_BASSE = re.compile(r"^partie basse$", re.IGNORECASE)
_PARTIE_HAUTE = re.compile(r"^partie haute$", re.IGNORECASE)


def pdf_header_title(label: str | None, default: str = "") -> str:
    """Libellé bandeau brush pour export PDF (majuscules sauf vide volontaire)."""
    raw = (label or default).strip()
    if not raw:
        return ""
    if _PARTIE_BASSE.match(raw):
        return ""
    if _PARTIE_HAUTE.match(raw):
        return "TABLEAU PRINCIPAL"
    return raw.upper()
