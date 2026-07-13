import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CourtBackground } from "../components/CourtBackground";
import type { TournamentForm } from "../types";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LiveProchainsMatchsTab } from "./LiveProchainsMatchsTab";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveBracketCrossPageOverlay } from "./LiveBracketCrossPageOverlay";
import { BracketCrossPageMetricsProvider } from "./bracketCrossPageMetrics";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { resolveTemplateId } from "./resolveTemplateId";
import type { LiveTournamentData } from "./liveTypes";
import {
  LIVE_PRIMARY_TABS,
  LIVE_TAB_WIDTH_CLASS,
  activeTabBrushLabel,
  mainPageHiddenBrushReserveLabel,
  pageEntries,
  planningIndicesForPage,
  primaryTabLabel,
  slideIndexAt,
  subTabLabels,
  defaultMainSubPage,
  type LivePrimaryTab,
} from "./liveTabs";
import { LiveTabTitle } from "./LiveTabTitle";
import { useLiveProgress } from "./useLiveProgress";
import type { LivePdfExportPayload } from "./LivePdfViewer";
import { captureManagerExportPages } from "./captureExportPages";
import type { ExportCaptureTarget, ExportPhase } from "./exportCapture";
import { ExportCaptureLayer } from "./ExportCaptureLayer";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";

const TAB_BASE =
  "min-w-0 truncate rounded-lg px-1 py-2.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:px-1.5 sm:py-3 sm:text-[10px]";

function stackedPanelClass(active: boolean) {
  return [
    "absolute inset-0 flex min-h-0 flex-col overflow-hidden transition-none",
    active ? "visible z-10" : "pointer-events-none invisible z-0",
  ].join(" ");
}

function tabClass(active: boolean) {
  return [
    TAB_BASE,
    active
      ? "bg-lime/15 text-lime ring-1 ring-lime/35"
      : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/70",
  ].join(" ");
}

interface LiveTournamentViewProps {
  form: TournamentForm;
  nbEquipes: number;
  liveData: LiveTournamentData;
  onPdfExported?: () => void;
}

export function LiveTournamentView({ liveData, onPdfExported }: LiveTournamentViewProps) {
  const {
    page_map,
    live_token,
    matches,
    meta,
    fields,
    planning_layout = {},
    pdf_filename,
  } = liveData;

  const progress = useLiveProgress(live_token, matches.length, meta);
  const templateId = useMemo(() => resolveTemplateId(meta), [meta]);

  useEffect(() => {
    void fetchTemplateLayout(templateId);
  }, [templateId]);

  const exportPayload = useMemo<LivePdfExportPayload>(() => {
    const match_results: LivePdfExportPayload["match_results"] = {};
    for (const [code, result] of Object.entries(progress.matchResults)) {
      match_results[code] = {
        winner: result.winner,
        loser: result.loser,
        display: result.display,
      };
    }

    return {
      page_map,
      template_id: templateId,
      matches,
      match_results,
      completed: [...progress.completed],
      fields,
      planning_layout: planning_layout ?? {},
      nb_equipes: meta.nb_equipes,
    };
  }, [
    page_map,
    templateId,
    matches,
    progress.matchResults,
    progress.completed,
    fields,
    planning_layout,
    meta.nb_equipes,
  ]);

  const mainPages = useMemo(() => pageEntries(page_map, "main"), [page_map]);
  const classementPages = useMemo(
    () => pageEntries(page_map, "classement"),
    [page_map]
  );
  const planningPages = useMemo(
    () => pageEntries(page_map, "planning"),
    [page_map]
  );
  const finalPages = useMemo(() => pageEntries(page_map, "final"), [page_map]);

  const [primaryTab, setPrimaryTab] = useState<LivePrimaryTab>("live");
  const [mainPage, setMainPage] = useState(0);
  const [classementPage, setClassementPage] = useState(0);
  const [planningPage, setPlanningPage] = useState(0);
  const [awaitingLaunch, setAwaitingLaunch] = useState<Set<string>>(
    () => new Set()
  );
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [exportCaptureTarget, setExportCaptureTarget] =
    useState<ExportCaptureTarget | null>(null);
  const bracketShellRef = useRef<HTMLDivElement>(null);
  const exportingPdf = exportPhase !== "idle";

  const captureExportPages = useCallback(async () => {
    return captureManagerExportPages(page_map, {
      showPage: (tab, subPage) => {
        setExportCaptureTarget({ section: tab, subPage });
      },
      restore: () => {
        setExportCaptureTarget(null);
      },
    });
  }, [page_map]);

  const activeSubPages = useMemo(() => {
    switch (primaryTab) {
      case "main":
        return subTabLabels(mainPages);
      case "classement":
        return subTabLabels(classementPages);
      case "planning":
        return subTabLabels(planningPages);
      default:
        return [];
    }
  }, [primaryTab, mainPages, classementPages, planningPages]);

  const showSubTabs = activeSubPages.length > 1;

  const subTabs = useMemo(() => {
    const pageState =
      primaryTab === "main"
        ? mainPage
        : primaryTab === "classement"
          ? classementPage
          : planningPage;

    return activeSubPages.map((label, i) => ({
      key: `${primaryTab}-${i}`,
      label,
      active: i === pageState,
      onSelect: () => {
        if (primaryTab === "main") setMainPage(i);
        else if (primaryTab === "classement") setClassementPage(i);
        else setPlanningPage(i);
      },
    }));
  }, [activeSubPages, primaryTab, mainPage, classementPage, planningPage]);

  const selectPrimary = (id: LivePrimaryTab) => {
    setPrimaryTab(id);
    if (id === "main") {
      setMainPage(defaultMainSubPage(mainPages, matches, progress.completed));
    }
    if (id === "classement") setClassementPage(0);
    if (id === "planning") setPlanningPage(0);
  };

  const slideIndices = useMemo(() => {
    switch (primaryTab) {
      case "main": {
        const index = slideIndexAt(mainPages, mainPage);
        return index !== null ? [index] : [];
      }
      case "classement": {
        const index = slideIndexAt(classementPages, classementPage);
        return index !== null ? [index] : [];
      }
      case "planning": {
        if (planningPages.length > 1) {
          const index = slideIndexAt(planningPages, planningPage);
          return index !== null ? [index] : [];
        }
        return planningIndicesForPage(page_map, planningPage);
      }
      case "final": {
        const index = slideIndexAt(finalPages, 0);
        return index !== null ? [index] : [];
      }
      default:
        return [];
    }
  }, [
    primaryTab,
    mainPages,
    mainPage,
    classementPages,
    classementPage,
    planningPage,
    page_map,
    finalPages,
    planningPages,
  ]);

  const renderDocumentTab = () => {
    switch (primaryTab) {
      case "main":
      case "classement": {
        const slideIndex = slideIndices[0];
        if (slideIndex === undefined) {
          return (
            <p className="py-8 text-center text-sm text-arena-600/55">
              Aucune page disponible pour cet onglet.
            </p>
          );
        }
        return (
          <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
            <LiveBracketViewer
              templateId={templateId}
              slideIndex={slideIndex}
              matches={matches}
              matchResults={progress.matchResults}
            />
          </LiveManagerDocumentPage>
        );
      }
      case "final":
        return (
          <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
            <LiveFinalRankingTab
              meta={meta}
              matches={matches}
              matchResults={progress.matchResults}
              fields={fields}
            />
          </LiveManagerDocumentPage>
        );
      case "planning": {
        const slideIndex = slideIndices[0];
        if (slideIndex === undefined) {
          return (
            <p className="py-8 text-center text-sm text-arena-600/55">
              Aucune page disponible pour cet onglet.
            </p>
          );
        }
        const layoutFields = planning_layout[String(slideIndex)] ?? [];
        return (
          <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
            <LivePlanningTab
              layoutFields={layoutFields}
              matches={matches}
              completed={progress.completed}
              matchResults={progress.matchResults}
              onToggleDone={progress.toggleMatch}
            />
          </LiveManagerDocumentPage>
        );
      }
      default:
        return null;
    }
  };

  const isBracketTab =
    primaryTab === "main" ||
    primaryTab === "classement" ||
    primaryTab === "final" ||
    primaryTab === "planning";

  const isProjectionTab = primaryTab === "live" || primaryTab === "upcoming";
  const isWhitePanelTab = isProjectionTab || isBracketTab || primaryTab === "avancement";

  const activeTabLabel = useMemo(
    () =>
      activeTabBrushLabel(primaryTab, {
        main: mainPages,
        classement: classementPages,
        planning: planningPages,
        mainPage,
        classementPage,
        planningPage,
      }),
    [
      primaryTab,
      mainPages,
      classementPages,
      planningPages,
      mainPage,
      classementPage,
      planningPage,
    ]
  );

  const tabTitleReserveLabel = useMemo(() => {
    if (primaryTab !== "main") return null;
    return mainPageHiddenBrushReserveLabel(mainPages[mainPage]);
  }, [primaryTab, mainPages, mainPage]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-arena-950 text-white">
      <CourtBackground />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
        <h1
          className="shrink-0 whitespace-nowrap text-center font-brush text-[clamp(1.35rem,3.2vw,2.35rem)] leading-none text-lime"
          style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
        >
          PADEL TOURNAMENT MANAGER
        </h1>

        <div className="mt-3 flex shrink-0 gap-0.5 overflow-hidden sm:gap-1">
          {LIVE_PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectPrimary(tab.id)}
              className={[tabClass(primaryTab === tab.id), "flex-1"].join(" ")}
              title={primaryTabLabel(tab.id, classementPages.length)}
            >
              {primaryTabLabel(tab.id, classementPages.length)}
            </button>
          ))}
        </div>

        {showSubTabs && (
          <div className="mt-2 flex shrink-0 justify-center gap-1 overflow-hidden">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={tab.onSelect}
                className={[tabClass(tab.active), LIVE_TAB_WIDTH_CLASS, "shrink-0"].join(
                  " "
                )}
                title={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div
          className={[
            "mt-3 flex min-h-0 flex-1 select-none flex-col overflow-hidden rounded-2xl border",
            isWhitePanelTab
              ? "border-arena-600/15 bg-white"
              : "border-lime/15 bg-arena-900/45 backdrop-blur-xl",
            primaryTab === "planning" ? "touch-manipulation" : "touch-none",
          ].join(" ")}
        >
          <div
            ref={isBracketTab ? bracketShellRef : undefined}
            className={[
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              isBracketTab ? "relative" : "",
            ].join(" ")}
          >
            <BracketCrossPageMetricsProvider>
            <div className="flex shrink-0 items-end justify-center px-4 pb-2 pt-1 transition-none sm:px-6 sm:pb-3 min-h-[clamp(2.75rem,6vw,3.75rem)]">
              <LiveTabTitle
                label={activeTabLabel}
                reserveLabel={tabTitleReserveLabel}
              />
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden transition-none">
              <div className={stackedPanelClass(primaryTab === "live")}>
                <LiveMatchsEnCoursTab
                  terrains={meta.terrains}
                  matches={matches}
                  meta={meta}
                  started={progress.started}
                  completed={progress.completed}
                  matchResults={progress.matchResults}
                  liveToken={live_token}
                  pdfFilename={pdf_filename}
                  exportPayload={exportPayload}
                  captureExportPages={captureExportPages}
                  exportingPdf={exportingPdf}
                  onExportPhaseChange={setExportPhase}
                  onPdfExported={onPdfExported}
                  onStart={(initialMatchCodes) =>
                    progress.startTournament(initialMatchCodes)
                  }
                  onCompleteMatch={progress.completeMatch}
                  onRecordMatchLaunch={progress.recordMatchLaunch}
                  awaitingLaunch={awaitingLaunch}
                  setAwaitingLaunch={setAwaitingLaunch}
                  forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
                  clearForcedForTerrain={progress.clearForcedForTerrain}
                />
              </div>

              <div className={stackedPanelClass(primaryTab === "upcoming")}>
                <LiveProchainsMatchsTab
                  terrains={meta.terrains}
                  matches={matches}
                  meta={meta}
                  completed={progress.completed}
                  matchResults={progress.matchResults}
                  started={progress.started}
                  awaitingLaunch={awaitingLaunch}
                  forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
                  applyForcedUpcoming={progress.applyForcedUpcoming}
                />
              </div>

              <div className={stackedPanelClass(primaryTab === "avancement")}>
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
              </div>

              <div
                className={[
                  stackedPanelClass(isBracketTab),
                  primaryTab === "planning" ? "touch-manipulation" : "touch-none",
                ].join(" ")}
              >
                {renderDocumentTab()}
              </div>
            </div>
            {isBracketTab ? (
              <LiveBracketCrossPageOverlay shellRef={bracketShellRef} />
            ) : null}
            </BracketCrossPageMetricsProvider>
          </div>
        </div>
      </div>

      <ExportCaptureLayer
        target={exportCaptureTarget}
        templateId={templateId}
        pageMap={page_map}
        matches={matches}
        matchResults={progress.matchResults}
        completed={progress.completed}
        planningLayout={planning_layout ?? {}}
        meta={meta}
        fields={fields}
      />
    </div>
  );
}
