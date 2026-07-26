"""Assemblage snapshot Live + captures pour Engine / regénération."""

from __future__ import annotations

from typing import TYPE_CHECKING

from api.platform.models import Tournament

if TYPE_CHECKING:
    from api.platform.models import ClubProfile


def tournament_snapshot_bundle(row: Tournament) -> dict:
    snapshot = dict(row.live_snapshot or {})
    captures = row.export_captures if isinstance(row.export_captures, dict) else None
    stubs = row.crosspage_stubs if isinstance(row.crosspage_stubs, dict) else None
    if captures:
        snapshot["export_captures"] = captures
    if stubs:
        snapshot["crosspage_stubs"] = stubs
    return snapshot


def live_snapshot_for_init(row: Tournament, profile: "ClubProfile | None" = None) -> dict:
    """Snapshot JSON pour lancer le Live (sans captures PDF export)."""
    from api.platform.engine_regen import attach_club_logo_to_snapshot

    snapshot = tournament_snapshot_bundle(row)
    attach_club_logo_to_snapshot(snapshot, profile)
    slim = {
        key: value
        for key, value in snapshot.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    slim.setdefault("version", "engine-v2-live-capture-1")
    slim.setdefault("pdf_filename", row.pdf_filename or "tournoi.pdf")
    return slim
