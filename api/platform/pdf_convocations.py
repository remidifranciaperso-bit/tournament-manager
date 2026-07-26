"""Extraction des pages convocations depuis un PDF tournoi Platform."""

from __future__ import annotations

import io
import re

import fitz

_CONVOCATION_RE = re.compile(r"CONVOCATION", re.IGNORECASE)
_PARTICIPANTS_MARKERS = ("JOUEUR 1", "CLASSEMENT J1")


def _page_est_convocations(text: str) -> bool:
    if _CONVOCATION_RE.search(text):
        return True
    upper = text.upper()
    if any(marker in upper for marker in _PARTICIPANTS_MARKERS):
        return False
    if "CODE" in upper and "TERRAIN" in upper:
        return False
    if "ÉQUIPE 1" in upper or "EQUIPE 1" in upper:
        return False
    return bool(re.search(r"\bÉQUIPE\b", upper) and re.search(r"\bHEURE\b", upper))


def trouver_indices_convocations(pdf_bytes: bytes) -> list[int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        indices: list[int] = []
        for index in range(doc.page_count):
            text = doc[index].get_text("text")
            if _page_est_convocations(text):
                indices.append(index)
        return indices
    finally:
        doc.close()


def extraire_pdf_convocations(pdf_bytes: bytes) -> bytes:
    indices = trouver_indices_convocations(pdf_bytes)
    if not indices:
        raise ValueError("Aucune page convocations dans ce PDF.")

    source = fitz.open(stream=pdf_bytes, filetype="pdf")
    merged = fitz.open()
    try:
        for index in indices:
            if 0 <= index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)
        if merged.page_count == 0:
            raise ValueError("Aucune page convocations dans ce PDF.")
        buffer = io.BytesIO()
        merged.save(buffer, garbage=4, deflate=True)
        return buffer.getvalue()
    finally:
        merged.close()
        source.close()
