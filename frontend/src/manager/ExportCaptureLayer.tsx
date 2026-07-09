import { EXPORT_CAPTURE_WIDTH, type ExportCaptureTarget } from "./exportCapture";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { pageEntries, slideIndexAt } from "./liveTabs";
import type { LivePageMap, LiveTournamentMeta, LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface ExportCaptureLayerProps {
  target: ExportCaptureTarget | null;
  templateId: string;
  pageMap: LivePageMap;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  meta: LiveTournamentMeta;
  fields: Record<string, string>;
}

export function ExportCaptureLayer({
  target,
  templateId,
  pageMap,
  matches,
  matchResults,
  meta,
  fields,
}: ExportCaptureLayerProps) {
  if (!target) return null;

  const { section, subPage } = target;

  if (section === "final") {
    return (
      <div
        id="export-capture-layer"
        className="pointer-events-none fixed -left-[120vw] top-0 z-0 bg-white"
        style={{ width: EXPORT_CAPTURE_WIDTH }}
        aria-hidden
      >
        <LiveManagerDocumentPage
          club={meta.club}
          logoUrl={meta.logo_url}
          capture="final"
        >
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={matchResults}
            fields={fields}
          />
        </LiveManagerDocumentPage>
      </div>
    );
  }

  const pages = pageEntries(pageMap, section);
  const slideIndex = slideIndexAt(pages, subPage);
  if (slideIndex === null) return null;

  return (
    <div
      id="export-capture-layer"
      className="pointer-events-none fixed -left-[120vw] top-0 z-0 bg-white"
      style={{ width: EXPORT_CAPTURE_WIDTH }}
      aria-hidden
    >
      <LiveManagerDocumentPage
        club={meta.club}
        logoUrl={meta.logo_url}
        capture="bracket"
      >
        <LiveBracketViewer
          templateId={templateId}
          slideIndex={slideIndex}
          matches={matches}
          matchResults={matchResults}
          fixedRenderWidth={EXPORT_CAPTURE_WIDTH}
        />
      </LiveManagerDocumentPage>
    </div>
  );
}
