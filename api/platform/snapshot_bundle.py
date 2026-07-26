"""Assemblage snapshot Live + captures pour Engine / regénération."""

from __future__ import annotations

from api.platform.models import Tournament


def tournament_snapshot_bundle(row: Tournament) -> dict:
    snapshot = dict(row.live_snapshot or {})
    captures = row.export_captures if isinstance(row.export_captures, dict) else None
    stubs = row.crosspage_stubs if isinstance(row.crosspage_stubs, dict) else None
    if captures:
        snapshot["export_captures"] = captures
    if stubs:
        snapshot["crosspage_stubs"] = stubs
    return snapshot
