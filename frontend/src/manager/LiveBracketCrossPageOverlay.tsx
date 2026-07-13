import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { useOptionalBracketCrossPageMetrics } from "./bracketCrossPageMetrics";

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

  const y1 = direction === "down" ? slideBottom : 0;
  const y2 = direction === "down" ? shellRect.height : slideTop;

  if (Math.abs(y2 - y1) < 0.5) return null;

  return {
    x,
    y1,
    y2,
    strokeWidth: Math.max(0.3, slideRect.width * 0.0008),
  };
}

/** Trait inter-pages sur toute la hauteur du panneau blanc (titre + tableau + pied). */
export function LiveBracketCrossPageOverlay({
  shellRef,
}: {
  shellRef: RefObject<HTMLElement | null>;
}) {
  const context = useOptionalBracketCrossPageMetrics();
  const [line, setLine] = useState<LineSegment | null>(null);

  const stub = context?.metrics?.stub ?? null;

  useLayoutEffect(() => {
    if (!stub || !context?.metrics) {
      setLine(null);
      return;
    }

    const shellEl = shellRef.current;
    if (!shellEl) return;

    const update = () => {
      const slideEl = shellEl.querySelector<HTMLElement>("[data-bracket-slide]");
      if (!slideEl) {
        setLine(null);
        return;
      }
      setLine(
        measureLine(shellEl, slideEl, stub.midXSlidePct, stub.direction)
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(shellEl);
    const slideEl = shellEl.querySelector<HTMLElement>("[data-bracket-slide]");
    if (slideEl) observer.observe(slideEl);

    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [shellRef, stub, context?.metrics]);

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
        strokeLinecap="butt"
        shapeRendering="geometricPrecision"
      />
    </svg>
  );
}
