import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { SLIDE_ASPECT } from "./bracketSlideLayout";
import type { LiveMatch } from "./liveTypes";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { useTemplateLayout } from "./useTemplateLayout";
import type { StoredMatchResult } from "./useLiveProgress";

interface LiveBracketViewerProps {
  templateId: string;
  slideIndex: number;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  fixedRenderWidth?: number;
}

export function LiveBracketViewer({
  templateId,
  slideIndex,
  matches,
  matchResults,
  fixedRenderWidth,
}: LiveBracketViewerProps) {
  const { layout, loading, error } = useTemplateLayout(templateId);
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = useState(0);

  const computeWidth = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return 0;
    const w = slot.clientWidth;
    const h = slot.clientHeight;
    if (w <= 0 || h <= 0) return 0;
    return Math.floor(Math.min(w, h * SLIDE_ASPECT));
  }, []);

  useLayoutEffect(() => {
    if (fixedRenderWidth) {
      setRenderWidth(fixedRenderWidth);
      return;
    }

    const slot = slotRef.current;
    if (!slot) return;

    const apply = () => {
      const next = computeWidth();
      if (next > 0) {
        setRenderWidth((prev) => (prev === next ? prev : next));
      }
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [fixedRenderWidth, computeWidth, layout, slideIndex]);

  const effectiveWidth = fixedRenderWidth ?? renderWidth;
  const fields = layout?.[String(slideIndex)] ?? [];
  const canRenderSlide =
    !loading && !error && layout && fields.length > 0 && effectiveWidth > 0;

  const slotClass = fixedRenderWidth
    ? "flex items-start justify-center bg-white transition-none"
    : "flex h-full min-h-0 w-full flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white px-2 pb-2 pt-0 transition-none sm:px-4 sm:pb-4";

  return (
    <div ref={slotRef} className={slotClass}>
      {canRenderSlide ? (
        <LiveBracketSlide
          fields={fields}
          matches={matches}
          matchResults={matchResults}
          renderWidth={effectiveWidth}
        />
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500/80">
          {error ?? "Layout indisponible"}
        </p>
      ) : !loading && fields.length === 0 ? (
        <p className="py-8 text-center text-sm text-arena-600/55">
          Aucune donnée pour cette page.
        </p>
      ) : (
        <div
          aria-hidden
          className="h-full max-h-full max-w-full shrink-0"
          style={{ aspectRatio: String(SLIDE_ASPECT) }}
        />
      )}
    </div>
  );
}
