"""Extraction des pages classement final depuis un PDF tournoi Platform."""

from __future__ import annotations

import io
import re

import fitz

_PLANNING_MARKERS = ("CODE", "TERRAIN", "ÉQUIPE 1", "EQUIPE 1")
_PARTICIPANTS_MARKERS = ("JOUEUR 1", "CLASSEMENT J1", "PARTICIPANTS")


def _page_est_classement_final(text: str) -> bool:
    upper = text.upper()
    if "CONVOCATION" in upper:
        return False
    if "PLANNING" in upper:
        return False
    if any(marker in upper for marker in _PARTICIPANTS_MARKERS):
        return False
    if any(marker in upper for marker in _PLANNING_MARKERS):
        return False
    if "CLASSEMENT FINAL" in upper:
        return True
    if "POINTS" in upper and "CLASSEMENT" in upper:
        return True
    return bool(
        "PLACE" in upper
        and "POINTS" in upper
        and re.search(r"\bÉQUIPE\b", upper)
        and not re.search(r"ÉQUIPE\s*1", upper)
    )


def trouver_indices_classement_final(pdf_bytes: bytes) -> list[int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        indices: list[int] = []
        for index in range(doc.page_count):
            text = doc[index].get_text("text")
            if _page_est_classement_final(text):
                indices.append(index)
        return indices
    finally:
        doc.close()


def extraire_pdf_classement_final(pdf_bytes: bytes) -> bytes:
    indices = trouver_indices_classement_final(pdf_bytes)
    if not indices:
        raise ValueError("Aucune page classement final dans ce PDF.")

    source = fitz.open(stream=pdf_bytes, filetype="pdf")
    merged = fitz.open()
    try:
        for index in indices:
            if 0 <= index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)
        if merged.page_count == 0:
            raise ValueError("Aucune page classement final dans ce PDF.")
        buffer = io.BytesIO()
        merged.save(buffer, garbage=4, deflate=True)
        return buffer.getvalue()
    finally:
        merged.close()
        source.close()
