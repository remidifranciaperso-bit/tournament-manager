import { useMemo, useState } from "react";
import { CourtBackground } from "../components/CourtBackground";
import type { TournamentForm } from "../types";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LivePdfViewer } from "./LivePdfViewer";
import type { LiveTournamentData } from "./liveTypes";
import {
  LIVE_PRIMARY_TABS,
  LIVE_TAB_WIDTH_CLASS,
  allSlideIndices,
  pageEntries,
  planningIndicesForPage,
  slideIndexAt,
  subTabLabels,
  type LivePrimaryTab,
} from "./liveTabs";
import { buildPlanningCheckOverlays } from "./planningOverlays";
import { useLiveProgress } from "./useLiveProgress";

const TAB_BASE =
  "min-w-0 truncate rounded-lg px-1 py-2.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide transition sm:px-1.5 sm:py-3 sm:text-[10px]";

function tabClass(active: boolean) {
  return [
    TAB_BASE,
    active
      ? "bg-lime/15 text-lime ring-1 ring-lime/35"
      : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/70",
  ].join(" ");
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <p className="max-w-md text-center text-sm text-white/40">
        Contenu « {label} » — à venir.
      </p>
    </div>
  );
}

interface LiveTournamentViewProps {
  form: TournamentForm;
  nbEquipes: number;
  liveData: LiveTournamentData;
}

export function LiveTournamentView({ liveData }: LiveTournamentViewProps) {
  const { page_map, live_token, matches, meta, fields, planning_layout = {} } =
    liveData;

  const progress = useLiveProgress(live_token, matches.length, meta);

  const prefetchIndices = useMemo(
    () => allSlideIndices(page_map),
    [page_map]
  );

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
    if (id === "main") setMainPage(0);
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

  const planningCheckboxes = useMemo(() => {
    if (primaryTab !== "planning" || slideIndices.length === 0) return [];

    const slideKey = String(slideIndices[0]);
    const layoutFields = planning_layout[slideKey] ?? [];

    return buildPlanningCheckOverlays(
      layoutFields,
      fields,
      matches,
      progress.completed,
      progress.toggleMatch
    );
  }, [
    primaryTab,
    slideIndices,
    planning_layout,
    fields,
    matches,
    progress.completed,
    progress.toggleMatch,
  ]);

  const renderContent = () => {
    switch (primaryTab) {
      case "avancement":
        return (
          <LiveAvancementTab
            elapsed={progress.elapsed}
            done={progress.done}
            total={progress.total}
            percent={progress.percent}
          />
        );
      case "live":
        return (
          <LiveMatchsEnCoursTab
            terrains={meta.terrains}
            matches={matches}
            started={progress.started}
            onStart={progress.startTournament}
          />
        );
      case "upcoming":
        return <PlaceholderTab label="Prochains matchs" />;
      case "main":
      case "classement":
      case "final":
        return (
          <LivePdfViewer
            liveToken={live_token}
            prefetchIndices={prefetchIndices}
            slideIndices={slideIndices}
          />
        );
      case "planning":
        return (
          <LivePdfViewer
            liveToken={live_token}
            prefetchIndices={prefetchIndices}
            slideIndices={slideIndices}
            checkboxes={planningCheckboxes}
          />
        );
      default:
        return null;
    }
  };

  const isSlideTab =
    primaryTab === "main" ||
    primaryTab === "classement" ||
    primaryTab === "planning" ||
    primaryTab === "final";

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
              title={tab.label}
            >
              {tab.label}
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
            "mt-3 flex min-h-0 flex-1 select-none flex-col overflow-hidden rounded-2xl border border-lime/15 bg-arena-900/45 backdrop-blur-xl",
            primaryTab === "planning" ? "touch-manipulation" : "touch-none",
          ].join(" ")}
        >
          <div
            className={
              isSlideTab
                ? primaryTab === "planning"
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden touch-manipulation"
                  : "flex min-h-0 flex-1 flex-col overflow-hidden touch-none"
                : "flex min-h-0 flex-1 flex-col overflow-y-auto"
            }
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
