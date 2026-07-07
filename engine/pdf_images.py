import base64


def extraire_pages_png(pdf_path, indices: list[int], dpi: int = 240) -> dict[str, str]:
    """Rend des pages PDF en PNG (base64). DPI élevé pour préserver les polices."""
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError(
            "pymupdf est requis pour le Manager live. "
            "Installez-le : pip install pymupdf"
        ) from exc

    if not indices:
        return {}

    doc = fitz.open(str(pdf_path))
    images: dict[str, str] = {}

    try:
        for index in sorted(set(indices)):
            if index < 0 or index >= doc.page_count:
                continue
            page = doc[index]
            pixmap = page.get_pixmap(dpi=dpi, alpha=False, annots=False)
            png_bytes = pixmap.tobytes("png")
            images[str(index)] = base64.b64encode(png_bytes).decode("ascii")
    finally:
        doc.close()

    return images


def indices_page_map(page_map: dict) -> list[int]:
    from engine.live_page_map import indices_depuis_page_map

    return indices_depuis_page_map(page_map)
