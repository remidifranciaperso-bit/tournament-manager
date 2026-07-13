import { useMemo, useState } from "react";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { LiveProchainsMatchsTab } from "./LiveProchainsMatchsTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { resolveTemplateId } from "./resolveTemplateId";
import type { BroadcastableTab } from "./liveRetransmission";
import type { LiveTournamentData } from "./liveTypes";
import { pageEntries, slideIndexAt } from "./liveTabs";
import { useLiveProgress } from "./useLiveProgress";

interface LiveBroadcastContentProps {
  liveData: LiveTournamentData;
  activeTab: BroadcastableTab;
}

export function LiveBroadcastContent({
  liveData,
  activeTab,
}: LiveBroadcastContentProps) {
  const {
    meta,
    matches,
    live_token,
    page_map,
    fields,
    planning_layout = {},
  } = liveData;

  const progress = useLiveProgress(live_token, matches.length, meta, {
    pollMs: 1500,
  });
  const templateId = useMemo(() => resolveTemplateId(meta), [meta]);

  const mainPages = useMemo(() => pageEntries(page_map, "main"), [page_map]);
  const classementPages = useMemo(
    () => pageEntries(page_map, "classement"),
    [page_map]
  );
  const planningPages = useMemo(
    () => pageEntries(page_map, "planning"),
    [page_map]
  );

  const mainSlideIndex = slideIndexAt(mainPages, 0);
  const classementSlideIndex = slideIndexAt(classementPages, 0);
  const planningSlideIndex = slideIndexAt(planningPages, 0);

  const [awaitingLaunch] = useState(() => new Set<string>());

  return (
    <div className="pointer-events-none flex h-dvh w-full flex-col overflow-hidden bg-white select-none">
      {activeTab === "live" ? (
        <LiveMatchsEnCoursTab
          terrains={meta.terrains}
          matches={matches}
          meta={meta}
          started={progress.started}
          completed={progress.completed}
          matchResults={progress.matchResults}
          liveToken={live_token}
          pdfFilename={liveData.pdf_filename}
          exportPayload={{
            page_map,
            template_id: templateId,
            matches,
            match_results: {},
            completed: [],
            fields,
            planning_layout,
            nb_equipes: meta.nb_equipes,
          }}
          captureExportPages={async () => ({})}
          exportingPdf={false}
          onExportPhaseChange={() => {}}
          onStart={() => {}}
          onCompleteMatch={() => {}}
          onRecordMatchLaunch={() => {}}
          awaitingLaunch={awaitingLaunch}
          setAwaitingLaunch={() => undefined}
          forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
          clearForcedForTerrain={() => {}}
        />
      ) : null}

      {activeTab === "upcoming" ? (
        <LiveProchainsMatchsTab
          terrains={meta.terrains}
          matches={matches}
          meta={meta}
          completed={progress.completed}
          matchResults={progress.matchResults}
          started={progress.started}
          awaitingLaunch={awaitingLaunch}
          forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
          applyForcedUpcoming={() => {}}
        />
      ) : null}

      {activeTab === "avancement" ? (
        <LiveAvancementTab
          elapsed={progress.elapsed}
          done={progress.done}
          total={progress.total}
          percent={progress.percent}
          club={meta.club}
          logoUrl={meta.logo_url}
          matchResults={progress.matchResults}
          matchLaunches={progress.matchLaunches}
          started={progress.started}
          finished={progress.finished}
        />
      ) : null}

      {activeTab === "main" && mainSlideIndex !== null ? (
        <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
          <LiveBracketViewer
            templateId={templateId}
            slideIndex={mainSlideIndex}
            matches={matches}
            matchResults={progress.matchResults}
          />
        </LiveManagerDocumentPage>
      ) : null}

      {activeTab === "classement" && classementSlideIndex !== null ? (
        <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
          <LiveBracketViewer
            templateId={templateId}
            slideIndex={classementSlideIndex}
            matches={matches}
            matchResults={progress.matchResults}
          />
        </LiveManagerDocumentPage>
      ) : null}

      {activeTab === "planning" && planningSlideIndex !== null ? (
        <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
          <LivePlanningTab
            layoutFields={planning_layout[String(planningSlideIndex)] ?? []}
            matches={matches}
            completed={progress.completed}
            matchResults={progress.matchResults}
            onToggleDone={() => {}}
          />
        </LiveManagerDocumentPage>
      ) : null}

      {activeTab === "final" ? (
        <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={progress.matchResults}
            fields={fields}
          />
        </LiveManagerDocumentPage>
      ) : null}
    </div>
  );
}
