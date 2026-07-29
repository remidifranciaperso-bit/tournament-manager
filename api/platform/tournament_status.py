"""Statut tournoi Platform — clôture automatique après la date de fin."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from api.platform.models import Tournament


def _meta(row: Tournament) -> dict[str, Any]:
    snapshot = row.live_snapshot if isinstance(row.live_snapshot, dict) else {}
    meta = snapshot.get("meta")
    return meta if isinstance(meta, dict) else {}


def tournament_end_date(row: Tournament) -> date | None:
    meta = _meta(row)
    date_iso = str(meta.get("date_tournoi") or "").strip()
    if date_iso:
        try:
            start = datetime.strptime(date_iso, "%Y-%m-%d").date()
        except ValueError:
            start = None
    else:
        start = None

    if start is None:
        stored = str(row.date_label or "").strip()
        match = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", stored)
        if match:
            day, month, year = match.groups()
            try:
                start = date(int(year), int(month), int(day))
            except ValueError:
                start = None

    if start is None:
        return None

    nb_jours = int(meta.get("nb_jours") or 1)
    if nb_jours < 1:
        nb_jours = 1
    return start + timedelta(days=nb_jours - 1)


def should_auto_finish(row: Tournament, *, today: date | None = None) -> bool:
    if row.status in {"finished", "live_active"}:
        return False
    end = tournament_end_date(row)
    if end is None:
        return False
    reference = today or date.today()
    return reference > end


def apply_auto_finish(rows: list[Tournament], db: Session) -> None:
    changed = False
    for row in rows:
        if should_auto_finish(row):
            row.status = "finished"
            changed = True
    if changed:
        db.commit()
