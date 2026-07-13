"""Traits de liaison entre encarts (port du frontend bracketConnectors)."""

from __future__ import annotations

import re

from engine.live_bracket_layout import parse_bracket_slide
from engine.live_team_resolve import feed_key_from_team_label


def _parent_code_from_label(label: str) -> str | None:
    feed = feed_key_from_team_label(label)
    if not feed:
        return None
    return re.sub(r"^(WIN|LOSE|SECOND|THIRD)_", "", feed)


def _connector_mid_x(parent_right: float, child_left: float) -> float:
    return parent_right + (child_left - parent_right) * 0.5


def _parent_outlet(rect: dict) -> tuple[float, float]:
    return rect["left"] + rect["width"], rect["top"] + rect["height"] / 2


def _child_inlet(rect: dict) -> tuple[float, float]:
    return rect["left"], rect["top"] + rect["height"] / 2


def _feed_anchor(field: dict, side: str) -> tuple[float, float]:
    x = field["left"] if side == "left" else field["left"] + field["width"]
    y = field["top"] + field["height"] * 0.5
    return x, y


def _bracket_paths_to_child(
    parent_rects: list[dict],
    child_rect: dict,
) -> list[list[tuple[float, float]]]:
    if not parent_rects:
        return []

    child_x, child_y = _child_inlet(child_rect)
    outlets = [_parent_outlet(rect) for rect in parent_rects]
    mid_x = _connector_mid_x(max(point[0] for point in outlets), child_x)

    paths: list[list[tuple[float, float]]] = []
    for outlet_x, outlet_y in outlets:
        paths.append([(outlet_x, outlet_y), (mid_x, outlet_y)])

    junction_ys = [point[1] for point in outlets] + [child_y]
    y_min = min(junction_ys)
    y_max = max(junction_ys)
    if y_max - y_min > 0.05:
        paths.append([(mid_x, y_min), (mid_x, y_max)])

    paths.append([(mid_x, child_y), (child_x, child_y)])
    return paths


def _feed_bracket_path(
    from_point: tuple[float, float],
    to_point: tuple[float, float],
) -> list[tuple[float, float]]:
    from_x, from_y = from_point
    to_x, to_y = to_point
    gap = to_x - from_x
    if gap <= 0.2:
        return [from_point, to_point]
    mid_x = from_x + gap * 0.5
    return [from_point, (mid_x, from_y), (mid_x, to_y), to_point]


def build_bracket_connector_paths(
    layout_fields: list[dict],
    matches: list[dict],
    *,
    include_feed_connectors: bool = True,
) -> list[list[tuple[float, float]]]:
    parsed = parse_bracket_slide(layout_fields)
    slots = parsed["matches"]
    feeds = parsed["feeds"]
    matches_by_code = {match["code"]: match for match in matches}
    slot_by_code = {slot["code"]: slot for slot in slots}

    from engine.live_bracket_box_layout import resolve_match_box_layouts, _h_sort_key

    match_codes = {match["code"] for match in matches}
    box_layouts = resolve_match_box_layouts(slots, match_codes=match_codes)

    consumed_feeds: set[str] = set()
    for slot in slots:
        match = matches_by_code.get(slot["code"])
        if not match:
            continue
        for label in (match.get("equipe1", ""), match.get("equipe2", "")):
            feed = feed_key_from_team_label(label)
            if feed:
                consumed_feeds.add(feed)

    parents_by_child: dict[str, list[dict]] = {}
    feed_to_child_links: list[tuple[tuple[float, float], tuple[float, float]]] = []

    for slot in slots:
        code = slot["code"]
        if code == "PF":
            continue
        match = matches_by_code.get(code)
        if not match:
            continue
        child_rect = box_layouts.get(code)
        if not child_rect:
            continue
        child_point = _child_inlet(child_rect)

        parent_codes: list[str] = []
        p1 = _parent_code_from_label(match.get("equipe1", "")) or (match.get("parents") or [None])[0]
        p2 = _parent_code_from_label(match.get("equipe2", "")) or (
            (match.get("parents") or [None, None])[1]
            if len(match.get("parents") or []) > 1
            else None
        )
        if p1:
            parent_codes.append(p1)
        if p2 and p2 != p1:
            parent_codes.append(p2)

        for parent_code in parent_codes:
            if parent_code in slot_by_code and parent_code in box_layouts:
                parents_by_child.setdefault(code, []).append(box_layouts[parent_code])
                continue

            if not include_feed_connectors:
                continue

            feed_key = None
            if _parent_code_from_label(match.get("equipe1", "")) == parent_code:
                feed_key = feed_key_from_team_label(match.get("equipe1", ""))
            else:
                feed_key = feed_key_from_team_label(match.get("equipe2", ""))

            feed_by_key = {field["key"]: field for field in feeds}
            win_key = f"WIN_{parent_code}"
            lose_key = f"LOSE_{parent_code}"
            feed_field = None
            if feed_key and feed_key not in consumed_feeds:
                feed_field = feed_by_key.get(feed_key)
            if feed_field is None:
                feed_field = feed_by_key.get(win_key) or feed_by_key.get(lose_key)

            if feed_field:
                feed_to_child_links.append((_feed_anchor(feed_field, "left"), child_point))

    paths: list[list[tuple[float, float]]] = []
    for child_code, parent_rects in parents_by_child.items():
        child_rect = box_layouts.get(child_code)
        if child_rect:
            paths.extend(_bracket_paths_to_child(parent_rects, child_rect))

    for from_point, to_point in feed_to_child_links:
        paths.append(_feed_bracket_path(from_point, to_point))

    slide_half = None
    h_on_slide = sorted(
        _h_sort_key(slot["code"])
        for slot in slots
        if re.match(r"^H\d+$", slot["code"])
    )
    if h_on_slide:
        if max(h_on_slide) <= 4:
            slide_half = "upper"
        elif min(h_on_slide) >= 5:
            slide_half = "lower"

    feed_by_key = {field["key"]: field for field in feeds}
    slot_codes = {slot["code"] for slot in slots}

    if slide_half == "lower":
        d2_rect = box_layouts.get("D2")
        if d2_rect and "F" not in slot_codes and "WIN_D2" not in feed_by_key:
            outlet_x, outlet_y = _parent_outlet(d2_rect)
            exit_y = 1.5
            mid_x = outlet_x + max(2.0, (100.0 - outlet_x) * 0.25)
            paths.append([(outlet_x, outlet_y), (mid_x, outlet_y), (mid_x, exit_y)])

    if slide_half == "upper":
        win_d2 = feed_by_key.get("WIN_D2")
        if win_d2 and "D2" not in slot_codes:
            feed_left = _feed_anchor(win_d2, "left")
            entry_y = 98.5
            paths.append([(feed_left[0], entry_y), feed_left])

    if include_feed_connectors:
        for field in feeds:
            if field["key"] in consumed_feeds:
                continue
            code = re.sub(r"^(WIN|LOSE|SECOND|THIRD)_", "", field["key"])
            if code == "PF" or code not in slot_by_code or code not in box_layouts:
                continue
            from_point = _parent_outlet(box_layouts[code])
            to_point = _feed_anchor(field, "right")
            if to_point[0] > from_point[0]:
                paths.append(_feed_bracket_path(from_point, to_point))

    return paths
