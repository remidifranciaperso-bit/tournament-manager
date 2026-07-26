"""Accès Engine V2 au PDF Platform (jeton court, usage live-init)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import JWTError, jwt

from api.platform.config import JWT_ALGORITHM, JWT_SECRET

PURPOSE_LIVE_PDF = "platform-live-pdf"


def create_live_pdf_token(tournament_id: UUID, *, minutes: int = 10) -> str:
    expire = datetime.now(tz=UTC) + timedelta(minutes=minutes)
    payload = {
        "sub": str(tournament_id),
        "purpose": PURPOSE_LIVE_PDF,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_live_pdf_token(token: str, tournament_id: UUID) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return False
    return payload.get("sub") == str(tournament_id) and payload.get("purpose") == PURPOSE_LIVE_PDF
