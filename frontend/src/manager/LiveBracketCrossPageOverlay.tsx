import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

interface LineSegment {
  x: number;
  y1: number;
  y2: number;
  strokeWidth: number;
}

function measureLine(
  shellEl: HTMLElement,
  slideEl: HTMLElement,
  midXSlidePct: number,
  direction: "up" | "down"
): LineSegment | null {
  const shellRect = shellEl.getBoundingClientRect();
  const slideRect = slideEl.getBoundingClientRect();
  if (shellRect.height <= 0 || slideRect.width <= 0) return null;

  const x =
    slideRect.left - shellRect.left + (slideRect.width * midXSlidePct) / 100;
  const slideTop = slideRect.top - shellRect.top;
  const slideBottom = slideRect.bottom - shellRect.top;
  const strokeWidth = Math.max(0.3, slideRect.width * 0.0008);
  const overlap = Math.max(1, strokeWidth * 0.5);

  const y1 = direction === "down" ? slideBottom - overlap : -overlap;
  const y2 =
    direction === "down" ? shellRect.height + overlap : slideTop + overlap;

  if (Math.abs(y2 - y1) < 0.5) return null;

  return { x, y1, y2, strokeWidth };
}

/**
 * Prolongement inter-pages D2↔F dans les marges blanches (haut ou bas du panneau).
 * Mesure directement le slide bracket VISIBLE (panneaux empilés) via ses attributs
 * data-crosspage-*, indépendamment des autres onglets montés.
 */
export function LiveBracketCrossPageOverlay({
  shellRef,
  activeKey,
}: {
  shellRef: RefObject<HTMLElement | null>;
  activeKey?: string;
}) {
  const [line, setLine] = useState<LineSegment | null>(null);

  useLayoutEffect(() => {
    const shellEl = shellRef.current;
    if (!shellEl) return;

    const findVisibleSlide = () =>
      shellEl.querySelector<HTMLElement>(".visible.z-10 [data-bracket-slide]");

    const update = () => {
      const slideEl = findVisibleSlide();
      if (!slideEl) {
        setLine(null);
        return;
      }

      const midXRaw = slideEl.getAttribute("data-crosspage-midx");
      const dir = slideEl.getAttribute("data-crosspage-dir");
      if (midXRaw == null || (dir !== "up" && dir !== "down")) {
        setLine(null);
        return;
      }

      const midXSlidePct = Number.parseFloat(midXRaw);
      if (!Number.isFinite(midXSlidePct)) {
        setLine(null);
        return;
      }

      const next = measureLine(shellEl, slideEl, midXSlidePct, dir);
      setLine((prev) => {
        if (
          prev &&
          next &&
          prev.x === next.x &&
          prev.y1 === next.y1 &&
          prev.y2 === next.y2 &&
          prev.strokeWidth === next.strokeWidth
        ) {
          return prev;
        }
        return next;
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(shellEl);
    const slideEl = findVisibleSlide();
    if (slideEl) observer.observe(slideEl);

    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [shellRef, activeKey]);

  if (!line) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 block"
      width="100%"
      height="100%"
      aria-hidden
    >
      <line
        x1={line.x}
        y1={line.y1}
        x2={line.x}
        y2={line.y2}
        stroke="#00B0F0"
        strokeWidth={line.strokeWidth}
        strokeLinecap="square"
        shapeRendering="geometricPrecision"
      />
    </svg>
  );
}
