"""Positionnement des encarts match (port du frontend bracketBoxLayout)."""

from __future__ import annotations

import re

STANDARD_MATCH_BOX = {
    "widthPct": 27.62,
    "heightPct": 21.5,
}

COLUMN_BUCKET_PCT = 6
PAGE_SPAN_PCT = 100
QUARTER_CODES = ("Q1", "Q2", "Q3", "Q4")


def _column_key(left: float) -> float:
    return round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT


def _h_sort_key(code: str) -> int:
    match = re.match(r"^H(\d+)$", code)
    return int(match.group(1)) if match else 0


def _quarter_index(code: str) -> int | None:
    match = re.match(r"^Q(\d+)$", code)
    if not match:
        return None
    return int(match.group(1)) - 1


def build_equal_gap_grid(
    slot_count: int,
    preferred_box_height: float,
    span: float = PAGE_SPAN_PCT,
) -> dict:
    box_height = preferred_box_height
    gap = (span - slot_count * box_height) / (slot_count + 1)
    if gap < 0:
        box_height = span / slot_count
        gap = 0
    tops = [gap + index * (box_height + gap) for index in range(slot_count)]
    return {"tops": tops, "boxHeight": box_height, "gap": gap}


def infer_quarter_slot_count(match_codes: set[str]) -> int:
    if "Q3" in match_codes or "Q4" in match_codes:
        return 4
    return 2


def _box_center_y(top: float, height: float) -> float:
    return top + height / 2


def _top_for_center(center_y: float, height: float) -> float:
    return center_y - height / 2


def _is_main_bracket_code(code: str) -> bool:
    return bool(
        re.match(r"^[HQ]\d+$", code)
        or re.match(r"^D\d+$", code)
        or code in {"F", "PF"}
    )


def _is_classement_code(code: str) -> bool:
    return bool(re.match(r"^C[\d_]+$", code))


def match_box_position(slot: dict) -> dict[str, float]:
    anchor = slot.get("code_field") or slot.get("terrain_field") or slot["bounds"]
    return {"x": anchor["left"], "y": anchor["top"]}


def _apply_main_bracket_positions(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    q_tops = quarter_grid["tops"]
    box_height = quarter_grid["boxHeight"]

    for code in QUARTER_CODES:
        index = _quarter_index(code)
        if index is None or index >= len(q_tops):
            continue
        if code in codes:
            tops[code] = q_tops[index]

    def q_top(index: int) -> float:
        return q_tops[index] if index < len(q_tops) else q_tops[-1]

    def q_center(index: int) -> float:
        return _box_center_y(q_top(index), box_height)

    d1_center = (q_center(0) + q_center(1)) / 2
    d2_center = (q_center(2) + q_center(3)) / 2

    if "D1" in codes:
        tops["D1"] = _top_for_center(d1_center, box_height)
    if "D2" in codes:
        tops["D2"] = _top_for_center(d2_center, box_height)
    if "F" in codes:
        tops["F"] = _top_for_center((d1_center + d2_center) / 2, box_height)
    if "PF" in codes:
        tops["PF"] = q_top(3)

    h_codes = sorted(
        (code for code in codes if re.match(r"^H\d+$", code)),
        key=_h_sort_key,
    )
    h_base = ((_h_sort_key(h_codes[0]) - 1) // 4) * 4 if h_codes else 0
    for code in h_codes:
        index = _h_sort_key(code) - 1 - h_base
        if 0 <= index < len(q_tops):
            tops[code] = q_tops[index]


def _apply_classement_column_positions(
    slots: list[dict],
    tops: dict[str, float],
    box_height: float,
) -> None:
    by_column: dict[float, list[dict]] = {}
    for slot in slots:
        if not _is_classement_code(slot["code"]):
            continue
        pos = match_box_position(slot)
        key = _column_key(pos["x"])
        by_column.setdefault(key, []).append({"code": slot["code"], "top": pos["y"]})

    for items in by_column.values():
        items.sort(key=lambda item: item["top"])
        grid = build_equal_gap_grid(len(items), box_height)
        for index, item in enumerate(items):
            tops[item["code"]] = grid["tops"][index]


def resolve_match_box_layouts(
    slots: list[dict],
    *,
    match_codes: set[str] | None = None,
) -> dict[str, dict]:
    codes = {slot["code"] for slot in slots}
    has_main_bracket = any(_is_main_bracket_code(code) for code in codes)
    tops: dict[str, float] = {}

    quarter_slot_count = infer_quarter_slot_count(match_codes or codes)
    quarter_grid = build_equal_gap_grid(
        quarter_slot_count,
        STANDARD_MATCH_BOX["heightPct"],
    )
    box_height = quarter_grid["boxHeight"] if has_main_bracket else STANDARD_MATCH_BOX["heightPct"]

    if has_main_bracket:
        _apply_main_bracket_positions(codes, tops, quarter_grid)

    _apply_classement_column_positions(slots, tops, box_height)

    layouts: dict[str, dict] = {}
    for slot in slots:
        pos = match_box_position(slot)
        layouts[slot["code"]] = {
            "left": pos["x"],
            "top": tops.get(slot["code"], pos["y"]),
            "width": STANDARD_MATCH_BOX["widthPct"],
            "height": box_height,
        }
    return layouts
