"""Régénération PDF Engine V2 depuis un snapshot Platform (sans Excel)."""

from __future__ import annotations

import copy
import tempfile
from pathlib import Path

from engine.live_valeurs import construire_champs_live
from engine.models.match import Match
from engine.models.team import Team
from engine.models.tournament import Tournament
from engine_v2.generate import composite_tournament_v2_pdf
from engine_v2.shell import _load_logo, build_v2_composite_shell_pdf


def _tournoi_from_snapshot(snapshot: dict) -> Tournament:
    meta = snapshot.get("meta") or {}
    equipes = [_equipe_from_dict(item) for item in snapshot.get("equipes") or []]
    heures = list(meta.get("heures_debut_jours") or [])
    if not heures:
        heures = [meta.get("heure_debut") or "18:00"]

    tournoi = Tournament(
        club=meta.get("club") or "",
        date_tournoi=meta.get("date_tournoi") or "",
        type_tournoi=meta.get("type_tournoi") or "",
        equipes=equipes,
        heure_debut=meta.get("heure_debut") or heures[0],
        duree_match=int(meta.get("duree_match") or 40),
        terrains=list(meta.get("terrains") or ["Terrain 1"]),
        terrain_principal=meta.get("terrain_principal") or "Terrain 1",
        mode_tournoi=meta.get("mode_tournoi") or "Élimination directe",
        nb_jours=int(meta.get("nb_jours") or 1),
        heures_debut_jours=heures,
    )
    if meta.get("genre_tournoi"):
        tournoi.genre_tournoi = meta.get("genre_tournoi")
    if meta.get("format_match_tableau_principal"):
        tournoi.format_match_tableau_principal = meta.get("format_match_tableau_principal")
    tournoi.format_match_classement = meta.get("format_match_classement") or "identique"
    tournoi.format_match_finale = meta.get("format_match_finale") or "identique"
    tournoi.format_match_poule = meta.get("format_match_poule") or "identique"
    return tournoi


def _equipe_from_dict(data: dict) -> Team:
    return Team(
        numero=int(data.get("numero") or data.get("ts") or 0),
        ts=int(data.get("ts") or 0),
        joueur1=str(data.get("joueur1") or ""),
        classement_j1=int(data.get("classement_j1") or 0),
        joueur2=str(data.get("joueur2") or ""),
        classement_j2=int(data.get("classement_j2") or 0),
        poids=int(data.get("poids") or 0),
    )


def _matchs_from_snapshot(snapshot: dict, equipes: list[Team]) -> list[Match]:
    labels: dict[str, Team] = {}
    for equipe in equipes:
        labels[equipe.nom_complet_court()] = equipe
        labels[equipe.nom_complet()] = equipe

    matchs: list[Match] = []
    for item in snapshot.get("matches") or []:
        e1 = labels.get(str(item.get("equipe1") or ""), item.get("equipe1"))
        e2 = labels.get(str(item.get("equipe2") or ""), item.get("equipe2"))
        matchs.append(
            Match(
                ordre=int(item.get("ordre") or 0),
                code=str(item.get("code") or ""),
                tour=str(item.get("tour") or ""),
                equipe1=e1,
                equipe2=e2,
                terrain=item.get("terrain"),
                heure=item.get("heure"),
                parents=list(item.get("parents") or []),
            )
        )
        if hasattr(matchs[-1], "jour"):
            matchs[-1].jour = int(item.get("jour") or 1)
        else:
            setattr(matchs[-1], "jour", int(item.get("jour") or 1))
        setattr(matchs[-1], "ordre_planning", int(item.get("ordre_planning") or item.get("ordre") or 0))
    return matchs


def _refresh_snapshot(snapshot: dict, tournoi: Tournament, matchs: list[Match]) -> dict:
    refreshed = copy.deepcopy(snapshot)
    refreshed["matches"] = [
        {
            "ordre": match.ordre,
            "code": match.code,
            "tour": match.tour,
            "equipe1": match.equipe1_label(),
            "equipe2": match.equipe2_label(),
            "terrain": match.terrain,
            "heure": match.heure,
            "jour": getattr(match, "jour", 1),
            "ordre_planning": getattr(match, "ordre_planning", match.ordre),
            "parents": list(match.parents),
        }
        for match in matchs
    ]
    refreshed["fields"] = construire_champs_live(tournoi, matchs)
    from engine.live_export import serialiser_equipe

    refreshed["equipes"] = [serialiser_equipe(equipe) for equipe in tournoi.equipes]
    if snapshot.get("export_captures"):
        refreshed["export_captures"] = snapshot["export_captures"]
    if snapshot.get("crosspage_stubs"):
        refreshed["crosspage_stubs"] = snapshot["crosspage_stubs"]
    if snapshot.get("logo_png"):
        refreshed["logo_png"] = snapshot["logo_png"]
    return refreshed


def regenerate_pdf_from_snapshot(
    snapshot: dict,
    captures: dict[str, str],
    *,
    base_dir: Path | None = None,
) -> tuple[bytes, dict]:
    if not isinstance(snapshot.get("page_map"), dict):
        raise ValueError("Snapshot incomplet (page_map manquant).")

    render_base = base_dir or Path(__file__).resolve().parent.parent
    tournoi = _tournoi_from_snapshot(snapshot)
    matchs = _matchs_from_snapshot(snapshot, tournoi.equipes)
    refreshed = _refresh_snapshot(snapshot, tournoi, matchs)

    logo_bytes = None
    logo_wh = None
    logo_path = None
    temp_logo = None
    if refreshed.get("logo_png"):
        import base64

        temp_logo = Path(tempfile.mkdtemp(prefix="platform-regen-logo-")) / "logo.png"
        temp_logo.write_bytes(base64.b64decode(refreshed["logo_png"]))
        logo_path = temp_logo
        logo_bytes, logo_wh = _load_logo(logo_path)

    shell_path, _ = build_v2_composite_shell_pdf(
        tournoi=tournoi,
        matchs=matchs,
        base_dir=render_base,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
    )

    export_path = shell_path.parent / f"{shell_path.stem}.regen.pdf"
    try:
        composite_tournament_v2_pdf(
            shell_pdf=shell_path,
            output_pdf=export_path,
            snapshot=refreshed,
            captures=captures,
            logo_path=logo_path,
            crosspage_stubs=refreshed.get("crosspage_stubs") or {},
        )
        pdf_bytes = export_path.read_bytes()
        return pdf_bytes, refreshed
    finally:
        if temp_logo is not None:
            temp_logo.unlink(missing_ok=True)
            temp_logo.parent.rmdir()
        shell_path.unlink(missing_ok=True)
        export_path.unlink(missing_ok=True)
