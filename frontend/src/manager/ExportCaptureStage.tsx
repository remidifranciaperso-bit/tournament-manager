import { SLIDE_ASPECT } from "./bracketSlideLayout";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { captureKey } from "./captureExportPages";
import type { LiveMatch, LivePageMap, LiveTournamentMeta } from "./liveTypes";
import { pageEntries } from "./liveTabs";
import { useTemplateLayout } from "./useTemplateLayout";
import type { StoredMatchResult } from "./useLiveProgress";

const EXPORT_BRACKET_WIDTH = 1100;
const EXPORT_TABLE_WIDTH = 980;

interface ExportCaptureStageProps {
  templateId: string;
  pageMap: LivePageMap;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  meta: LiveTournamentMeta;
  fields: Record<string, string>;
}

export function ExportCaptureStage({
  templateId,
  pageMap,
  matches,
  matchResults,
  meta,
  fields,
}: ExportCaptureStageProps) {
  const { layout } = useTemplateLayout(templateId);
  if (!layout) return null;

  const bracketHeight = Math.round(EXPORT_BRACKET_WIDTH / SLIDE_ASPECT);
  const mainPages = pageEntries(pageMap, "main");
  const classementPages = pageEntries(pageMap, "classement");
  const finalPages = pageEntries(pageMap, "final");

  return (
    <div
      id="manager-export-stage"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: "translateX(-100vw)",
        opacity: 1,
        pointerEvents: "none",
        overflow: "visible",
        background: "#ffffff",
      }}
    >
      {mainPages.map((entry) => {
        const fieldsForSlide = layout[String(entry.index)] ?? [];
        return (
          <div
            key={captureKey("main", entry.index)}
            data-export-page={captureKey("main", entry.index)}
            style={{ width: EXPORT_BRACKET_WIDTH, height: bracketHeight }}
          >
            <LiveBracketSlide
              fields={fieldsForSlide}
              matches={matches}
              matchResults={matchResults}
              renderWidth={EXPORT_BRACKET_WIDTH}
            />
          </div>
        );
      })}

      {classementPages.map((entry) => {
        const fieldsForSlide = layout[String(entry.index)] ?? [];
        return (
          <div
            key={captureKey("classement", entry.index)}
            data-export-page={captureKey("classement", entry.index)}
            style={{ width: EXPORT_BRACKET_WIDTH, height: bracketHeight }}
          >
            <LiveBracketSlide
              fields={fieldsForSlide}
              matches={matches}
              matchResults={matchResults}
              renderWidth={EXPORT_BRACKET_WIDTH}
            />
          </div>
        );
      })}

      {finalPages.map((entry) => (
        <div
          key={captureKey("final", entry.index)}
          data-export-page={captureKey("final", entry.index)}
          style={{
            width: EXPORT_TABLE_WIDTH,
            background: "#ffffff",
            padding: "16px 20px",
          }}
        >
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={matchResults}
            fields={fields}
          />
        </div>
      ))}
    </div>
  );
}
