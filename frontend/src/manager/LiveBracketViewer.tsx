import { useCallback, useEffect, useRef, useState } from "react";
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
  const [renderWidth, setRenderWidth] = useState(960);

  const computeWidth = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const w = slot.clientWidth;
    const h = slot.clientHeight;
    if (w <= 0 || h <= 0) return;
    setRenderWidth(Math.floor(Math.min(w, h * SLIDE_ASPECT)));
  }, []);

  useEffect(() => {
    if (fixedRenderWidth) {
      setRenderWidth(fixedRenderWidth);
      return;
    }

    const slot = slotRef.current;
    if (!slot) return;

    computeWidth();
    const observer = new ResizeObserver(() => computeWidth());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [fixedRenderWidth, computeWidth, layout]);

  const effectiveWidth = fixedRenderWidth ?? renderWidth;

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-arena-600/55">
        Chargement du tableau…
      </p>
    );
  }

  if (error || !layout) {
    return (
      <p className="py-8 text-center text-sm text-red-500/80">
        {error ?? "Layout indisponible"}
      </p>
    );
  }

  const fields = layout[String(slideIndex)] ?? [];
  if (fields.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-arena-600/55">
        Aucune donnée pour cette page.
      </p>
    );
  }

  return (
    <div
      ref={slotRef}
      className={
        fixedRenderWidth
          ? "flex items-start justify-center bg-white"
          : "flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white px-2 pb-2 pt-0 sm:px-4 sm:pb-4"
      }
    >
      <LiveBracketSlide
        fields={fields}
        matches={matches}
        matchResults={matchResults}
        renderWidth={effectiveWidth}
      />
    </div>
  );
}
