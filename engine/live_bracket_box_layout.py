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
EIGHT_TEAM_ROWS = ("q0", "q1", "q2", "q3", "d1", "d2", "f", "pf")


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


def infer_split_main_bracket_half(
    slide_codes: set[str],
    all_match_codes: set[str],
) -> str | None:
    has_h_round = any(re.match(r"^H\d+$", code) for code in all_match_codes)
    if not has_h_round:
        return None

    h_on_slide = sorted(
        _h_sort_key(code) for code in slide_codes if re.match(r"^H\d+$", code)
    )
    if not h_on_slide:
        return None

    min_h = h_on_slide[0]
    max_h = h_on_slide[-1]
    if min_h <= 4 and max_h > 4:
        return None
    if max_h <= 4:
        return "upper"
    if min_h >= 5:
        return "lower"
    return None


def _box_center_y(top: float, height: float) -> float:
    return top + height / 2


def _top_for_center(center_y: float, height: float) -> float:
    return center_y - height / 2


def _eight_team_row_top(row: str, grid: dict) -> float:
    q_tops = grid["tops"]
    box_height = grid["boxHeight"]

    def q_top(index: int) -> float:
        return q_tops[index] if index < len(q_tops) else q_tops[-1]

    def q_center(index: int) -> float:
        return _box_center_y(q_top(index), box_height)

    d1_center = (q_center(0) + q_center(1)) / 2
    d2_center = (q_center(2) + q_center(3)) / 2
    f_center = (d1_center + d2_center) / 2

    if row == "q0":
        return q_top(0)
    if row == "q1":
        return q_top(1)
    if row == "q2":
        return q_top(2)
    if row == "q3":
        return q_top(3)
    if row == "d1":
        return _top_for_center(d1_center, box_height)
    if row == "d2":
        return _top_for_center(d2_center, box_height)
    if row == "f":
        return _top_for_center(f_center, box_height)
    return q_top(3)


def _set_eight_team_row(
    tops: dict[str, float],
    code: str,
    row: str,
    grid: dict,
) -> None:
    tops[code] = _eight_team_row_top(row, grid)


def _is_main_bracket_code(code: str) -> bool:
    return bool(
        re.match(r"^[HQ]\d+$", code)
        or re.match(r"^D\d+$", code)
        or code in {"F", "PF"}
    )


def _is_classement_code(code: str) -> bool:
    return bool(re.match(r"^C[\d_]+$", code))


def _is_prelim_code(code: str) -> bool:
    return bool(re.match(r"^P\d+$", code))


def _is_prelim_only_slide(codes: set[str]) -> bool:
    return bool(codes) and all(_is_prelim_code(code) for code in codes)


def _detect_classement_eight_team_style(codes: set[str]) -> str | None:
    if "C9_16_1" in codes or "C9_12_1" in codes:
        return "main"
    if "C17_24_1" in codes or "C17_20_1" in codes:
        return "main1720"
    if "C21_24_1" in codes:
        return "ranking2124"
    if "C5_8_1" in codes or "C13_16_1" in codes:
        return "ranking"
    return None


def match_box_position(slot: dict) -> dict[str, float]:
    anchor = slot.get("code_field") or slot.get("terrain_field") or slot["bounds"]
    return {"x": anchor["left"], "y": anchor["top"]}


def _apply_main_bracket_positions(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    for code in QUARTER_CODES:
        index = _quarter_index(code)
        if index is None or index >= len(quarter_grid["tops"]):
            continue
        if code in codes:
            _set_eight_team_row(tops, code, f"q{index}", quarter_grid)

    if "D1" in codes:
        _set_eight_team_row(tops, "D1", "d1", quarter_grid)
    if "D2" in codes:
        _set_eight_team_row(tops, "D2", "d2", quarter_grid)
    if "F" in codes:
        _set_eight_team_row(tops, "F", "f", quarter_grid)
    if "PF" in codes:
        _set_eight_team_row(tops, "PF", "pf", quarter_grid)


def _apply_split_main_bracket_half(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
    half: str,
) -> None:
    h_base = 0 if half == "upper" else 4

    for code in codes:
        if not re.match(r"^H\d+$", code):
            continue
        index = _h_sort_key(code) - 1 - h_base
        if 0 <= index < 4:
            _set_eight_team_row(tops, code, f"q{index}", quarter_grid)

    if half == "upper":
        if "Q1" in codes:
            _set_eight_team_row(tops, "Q1", "d1", quarter_grid)
        if "Q2" in codes:
            _set_eight_team_row(tops, "Q2", "d2", quarter_grid)
        if "D1" in codes:
            _set_eight_team_row(tops, "D1", "f", quarter_grid)
        if "F" in codes:
            _set_eight_team_row(tops, "F", "pf", quarter_grid)
    else:
        if "Q3" in codes:
            _set_eight_team_row(tops, "Q3", "d1", quarter_grid)
        if "Q4" in codes:
            _set_eight_team_row(tops, "Q4", "d2", quarter_grid)
        if "D2" in codes:
            _set_eight_team_row(tops, "D2", "f", quarter_grid)
        if "PF" in codes:
            _set_eight_team_row(tops, "PF", "pf", quarter_grid)


def _apply_classement_main_eight_team(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    for index, code in enumerate(
        ("C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4")
    ):
        if code in codes:
            _set_eight_team_row(tops, code, f"q{index}", quarter_grid)

    if "C9_12_1" in codes:
        _set_eight_team_row(tops, "C9_12_1", "d1", quarter_grid)
    if "C9_12_2" in codes:
        _set_eight_team_row(tops, "C9_12_2", "d2", quarter_grid)
    if "C9_10" in codes:
        _set_eight_team_row(tops, "C9_10", "f", quarter_grid)
    if "C11_12" in codes:
        _set_eight_team_row(tops, "C11_12", "pf", quarter_grid)


def _apply_classement_1720_eight_team(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    for index, code in enumerate(
        ("C17_24_1", "C17_24_2", "C17_24_3", "C17_24_4")
    ):
        if code in codes:
            _set_eight_team_row(tops, code, f"q{index}", quarter_grid)

    if "C17_20_1" in codes:
        _set_eight_team_row(tops, "C17_20_1", "d1", quarter_grid)
    if "C17_20_2" in codes:
        _set_eight_team_row(tops, "C17_20_2", "d2", quarter_grid)
    if "C17_18" in codes:
        _set_eight_team_row(tops, "C17_18", "f", quarter_grid)
    if "C19_20" in codes:
        _set_eight_team_row(tops, "C19_20", "pf", quarter_grid)


def _apply_classement_2124_eight_team(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    if "C21_24_1" in codes:
        _set_eight_team_row(tops, "C21_24_1", "d1", quarter_grid)
    if "C21_24_2" in codes:
        _set_eight_team_row(tops, "C21_24_2", "d2", quarter_grid)
    if "C23_24" in codes:
        _set_eight_team_row(tops, "C23_24", "f", quarter_grid)
    if "C21_22" in codes:
        _set_eight_team_row(tops, "C21_22", "f", quarter_grid)


def _apply_classement_ranking_eight_team(
    codes: set[str],
    tops: dict[str, float],
    quarter_grid: dict,
) -> None:
    semi1 = (
        "C5_8_1"
        if "C5_8_1" in codes
        else "C13_16_1"
        if "C13_16_1" in codes
        else None
    )
    semi2 = (
        "C5_8_2"
        if "C5_8_2" in codes
        else "C13_16_2"
        if "C13_16_2" in codes
        else None
    )
    final_left = (
        "C7_8"
        if "C7_8" in codes
        else "C15_16"
        if "C15_16" in codes
        else None
    )
    final_right = (
        "C5_6"
        if "C5_6" in codes
        else "C13_14"
        if "C13_14" in codes
        else None
    )

    if semi1:
        _set_eight_team_row(tops, semi1, "d1", quarter_grid)
    if semi2:
        _set_eight_team_row(tops, semi2, "d2", quarter_grid)
    if final_left:
        _set_eight_team_row(tops, final_left, "f", quarter_grid)
    if final_right:
        _set_eight_team_row(tops, final_right, "f", quarter_grid)


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


def _apply_prelim_column_positions(
    slots: list[dict],
    tops: dict[str, float],
    lefts: dict[str, float],
    box_width: float,
    box_height: float,
) -> None:
    prelim_slots = [slot for slot in slots if _is_prelim_code(slot["code"])]
    if not prelim_slots:
        return

    by_column: dict[float, list[dict]] = {}
    for slot in prelim_slots:
        pos = match_box_position(slot)
        key = _column_key(pos["x"])
        by_column.setdefault(key, []).append(slot)

    column_keys = sorted(by_column.keys())

    for column_index, key in enumerate(column_keys):
        col_slots = by_column[key]
        col_slots.sort(
            key=lambda slot: match_box_position(slot)["y"]
        )

        grid = build_equal_gap_grid(len(col_slots), box_height)
        span_width = PAGE_SPAN_PCT / len(column_keys)
        span_start = column_index * span_width
        centered_left = span_start + (span_width - box_width) / 2

        for slot_index, slot in enumerate(col_slots):
            tops[slot["code"]] = grid["tops"][slot_index]
            lefts[slot["code"]] = centered_left


def resolve_match_box_layouts(
    slots: list[dict],
    *,
    match_codes: set[str] | None = None,
) -> dict[str, dict]:
    codes = {slot["code"] for slot in slots}
    all_match_codes = match_codes or codes
    has_main_bracket = any(_is_main_bracket_code(code) for code in codes)
    prelim_only = _is_prelim_only_slide(codes)
    split_half = infer_split_main_bracket_half(codes, all_match_codes)
    classement_style = _detect_classement_eight_team_style(codes)
    tops: dict[str, float] = {}
    lefts: dict[str, float] = {}

    quarter_slot_count = infer_quarter_slot_count(all_match_codes)
    quarter_grid = build_equal_gap_grid(
        quarter_slot_count,
        STANDARD_MATCH_BOX["heightPct"],
    )
    use_eight_team_grid = has_main_bracket or classement_style is not None or prelim_only
    box_height = (
        quarter_grid["boxHeight"]
        if use_eight_team_grid
        else STANDARD_MATCH_BOX["heightPct"]
    )

    if has_main_bracket:
        if split_half:
            _apply_split_main_bracket_half(codes, tops, quarter_grid, split_half)
        else:
            _apply_main_bracket_positions(codes, tops, quarter_grid)
    elif classement_style == "main":
        _apply_classement_main_eight_team(codes, tops, quarter_grid)
    elif classement_style == "main1720":
        _apply_classement_1720_eight_team(codes, tops, quarter_grid)
    elif classement_style == "ranking2124":
        _apply_classement_2124_eight_team(codes, tops, quarter_grid)
    elif classement_style == "ranking":
        _apply_classement_ranking_eight_team(codes, tops, quarter_grid)
    elif not prelim_only:
        _apply_classement_column_positions(slots, tops, box_height)

    if prelim_only:
        _apply_prelim_column_positions(
            slots, tops, lefts, STANDARD_MATCH_BOX["widthPct"], box_height
        )

    layouts: dict[str, dict] = {}
    for slot in slots:
        pos = match_box_position(slot)
        layouts[slot["code"]] = {
            "left": lefts.get(slot["code"], pos["x"]),
            "top": tops.get(slot["code"], pos["y"]),
            "width": STANDARD_MATCH_BOX["widthPct"],
            "height": box_height,
        }
    return layouts
