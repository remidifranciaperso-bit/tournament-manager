import json
from pathlib import Path

from engine.live_layout import extraire_layout_planning
from engine.live_page_map import (
    cartographier_slides,
    elaguer_planning_layout,
    indices_depuis_page_map,
    normaliser_page_map_planning,
)

EMU_PER_POINT = 914400 / 72

# Incrémenter quand la cartographie / filtre planning change.
LIVE_TEMPLATE_CACHE_VERSION = "planning-filter-v3-20260724"


def _cache_path(template_path: Path) -> Path:
    return template_path.with_suffix(template_path.suffix + ".live.json")


def _slide_size_points(template_path: Path) -> tuple[float, float]:
    from pptx import Presentation

    prs = Presentation(str(template_path))
    return (
        round(prs.slide_width / EMU_PER_POINT, 3),
        round(prs.slide_height / EMU_PER_POINT, 3),
    )


def construire_cache_live(template_path: Path) -> dict:
    template_path = Path(template_path)
    page_map = cartographier_slides(template_path)
    width, height = _slide_size_points(template_path)
    planning_layout = extraire_layout_planning(template_path, page_map)
    page_map = normaliser_page_map_planning(
        page_map,
        planning_layout=planning_layout,
        template_path=template_path,
    )
    planning_layout = elaguer_planning_layout(page_map, planning_layout)
    page_sizes = {
        str(index): {"width": width, "height": height}
        for index in indices_depuis_page_map(page_map)
    }
    return {
        "cache_version": LIVE_TEMPLATE_CACHE_VERSION,
        "page_map": page_map,
        "planning_layout": planning_layout,
        "page_sizes": page_sizes,
    }


def ecrire_cache_live(template_path: Path) -> dict:
    template_path = Path(template_path)
    cache = construire_cache_live(template_path)
    destination = _cache_path(template_path)
    destination.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return cache


def charger_cache_live(template_path: Path) -> dict:
    template_path = Path(template_path)
    destination = _cache_path(template_path)
    if destination.is_file():
        cache = json.loads(destination.read_text(encoding="utf-8"))
        if cache.get("cache_version") == LIVE_TEMPLATE_CACHE_VERSION:
            return cache
    return ecrire_cache_live(template_path)
