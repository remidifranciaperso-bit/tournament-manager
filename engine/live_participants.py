"""Repérage des pages participants dans le PDF Engine."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

_PARTICIPANT_RE = re.compile(r"PARTICIPANT", re.IGNORECASE)


def trouver_indices_participants(pdf_path: Path) -> list[int]:
    doc = fitz.open(str(pdf_path))
    indices: list[int] = []

    try:
        for index in range(doc.page_count):
            text = doc[index].get_text("text")
            upper = text.upper()
            if "CONVOCATION" in upper:
                continue
            if _PARTICIPANT_RE.search(text):
                indices.append(index)
    finally:
        doc.close()

    return indices
