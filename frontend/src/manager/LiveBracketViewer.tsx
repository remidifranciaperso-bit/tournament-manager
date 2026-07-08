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
}

export function LiveBracketViewer({
  templateId,
  slideIndex,
  matches,
  matchResults,
}: LiveBracketViewerProps) {
  const { layout, loading, error } = useTemplateLayout(templateId);
  const slotRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = useState(960);

  const computeWidth = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    if (w <= 0 || h <= 0) return;
    setRenderWidth(Math.floor(Math.min(w, h * SLIDE_ASPECT)));
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    computeWidth();
    const observer = new ResizeObserver(() => computeWidth());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [computeWidth, layout]);

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
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white p-3 sm:p-5"
    >
      <div
        ref={frameRef}
        className="flex h-full max-h-full w-full max-w-full items-center justify-center rounded-xl border-2 border-template-blue bg-white p-1.5 shadow-[inset_0_0_0_1px_rgba(0,176,240,0.15)] sm:p-2"
      >
        <LiveBracketSlide
          fields={fields}
          matches={matches}
          matchResults={matchResults}
          renderWidth={renderWidth}
        />
      </div>
    </div>
  );
}
