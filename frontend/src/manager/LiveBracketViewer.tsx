import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { useTemplateLayout } from "./useTemplateLayout";
import type { StoredMatchResult } from "./useLiveProgress";

interface LiveBracketViewerProps {
  templateId: string;
  slideIndex: number;
  matches: LiveMatch[];
  meta: LiveTournamentMeta;
  matchResults: Record<string, StoredMatchResult>;
}

export function LiveBracketViewer({
  templateId,
  slideIndex,
  matches,
  meta,
  matchResults,
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
    setRenderWidth(Math.floor(Math.min(w, h * (9906000 / 6858000))));
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    computeWidth();
    const observer = new ResizeObserver(() => computeWidth());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [computeWidth]);

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
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white p-2 sm:p-4"
    >
      <LiveBracketSlide
        fields={fields}
        matches={matches}
        matchResults={matchResults}
        renderWidth={renderWidth}
      />
    </div>
  );
}
