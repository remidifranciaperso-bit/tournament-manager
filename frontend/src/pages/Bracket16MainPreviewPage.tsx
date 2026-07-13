import { useRef, useState } from "react";
import { LiveBracketCrossPageOverlay } from "../manager/LiveBracketCrossPageOverlay";
import { BracketCrossPageMetricsProvider } from "../manager/bracketCrossPageMetrics";
import { LiveBracketViewer } from "../manager/LiveBracketViewer";
import { LiveClubFooter } from "../manager/LiveClubFooter";
import { LiveTabTitle } from "../manager/LiveTabTitle";
import { mockBracket16Matches } from "../preview/mockBracket16Matches";

const TEMPLATE_ID = "Template_16_1J";
const SLIDES = [
  { index: 3, label: "Tableau Principal", reserve: null },
  { index: 4, label: "", reserve: "Partie basse" },
] as const;

export default function Bracket16MainPreviewPage() {
  const [half, setHalf] = useState<0 | 1>(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const matches = mockBracket16Matches();
  const slide = SLIDES[half];

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-arena-950 text-white">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-lime">
          Preview locale — tableau principal 16 équipes ({TEMPLATE_ID})
        </p>
        <div className="mt-2 flex justify-center gap-2">
          {SLIDES.map((entry, index) => (
            <button
              key={entry.index}
              type="button"
              onClick={() => setHalf(index as 0 | 1)}
              className={[
                "rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide",
                half === index
                  ? "bg-lime/15 text-lime ring-1 ring-lime/35"
                  : "bg-white/[0.04] text-white/45",
              ].join(" ")}
            >
              {index === 0 ? "Partie haute" : "Partie basse"}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={shellRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border border-arena-600/15 bg-white"
      >
        <BracketCrossPageMetricsProvider>
          <LiveTabTitle label={slide.label} reserveLabel={slide.reserve} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LiveBracketViewer
              templateId={TEMPLATE_ID}
              slideIndex={slide.index}
              matches={matches}
              matchResults={{}}
            />
            <LiveClubFooter club="Preview Club" />
          </div>
          <LiveBracketCrossPageOverlay shellRef={shellRef} />
        </BracketCrossPageMetricsProvider>
      </div>
    </div>
  );
}
