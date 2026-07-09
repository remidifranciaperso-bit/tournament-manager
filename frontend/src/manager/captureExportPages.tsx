import { type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { domToPng } from "./captureElement";
import type { LivePdfExportPayload } from "./LivePdfViewer";
import type { LiveLayoutField, LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

const BRACKET_CAPTURE_WIDTH = 1000;
const TABLE_CAPTURE_WIDTH = 980;

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

function asMatchResults(
  matchResults: LivePdfExportPayload["match_results"]
): Record<string, StoredMatchResult> {
  return matchResults as Record<string, StoredMatchResult>;
}

async function renderAndCapture(
  root: ReturnType<typeof createRoot>,
  host: HTMLDivElement,
  key: string,
  node: ReactNode,
  width: number,
  captures: Record<string, string>
): Promise<void> {
  flushSync(() => {
    root.render(
      <div
        data-capture-root
        style={{ width, background: "#ffffff", margin: 0 }}
      >
        {node}
      </div>
    );
  });

  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 250));

  const target = host.querySelector("[data-capture-root]") as HTMLElement | null;
  if (!target) {
    throw new Error(`Capture impossible pour ${key}.`);
  }

  captures[key] = await domToPng(target, width);
}

export async function captureManagerExportPages(
  payload: LivePdfExportPayload,
  meta: LiveTournamentMeta
): Promise<Record<string, string>> {
  const layout = await fetchTemplateLayout(payload.template_id);
  const captures: Record<string, string> = {};
  const completed = new Set(payload.completed);
  const matchResults = asMatchResults(payload.match_results);

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-14000px;top:0;z-index:-1;opacity:1;pointer-events:none;background:#fff";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    for (const entry of payload.page_map.main) {
      const fields = layout[String(entry.index)] ?? [];
      await renderAndCapture(
        root,
        host,
        captureKey("main", entry.index),
        <LiveBracketSlide
          fields={fields}
          matches={payload.matches}
          matchResults={matchResults}
          renderWidth={BRACKET_CAPTURE_WIDTH}
        />,
        BRACKET_CAPTURE_WIDTH,
        captures
      );
    }

    for (const entry of payload.page_map.classement) {
      const fields = layout[String(entry.index)] ?? [];
      await renderAndCapture(
        root,
        host,
        captureKey("classement", entry.index),
        <LiveBracketSlide
          fields={fields}
          matches={payload.matches}
          matchResults={matchResults}
          renderWidth={BRACKET_CAPTURE_WIDTH}
        />,
        BRACKET_CAPTURE_WIDTH,
        captures
      );
    }

    for (const entry of payload.page_map.planning) {
      const layoutFields: LiveLayoutField[] =
        payload.planning_layout[String(entry.index)] ??
        layout[String(entry.index)] ??
        [];

      await renderAndCapture(
        root,
        host,
        captureKey("planning", entry.index),
        <div style={{ width: TABLE_CAPTURE_WIDTH, background: "#ffffff", padding: "16px 20px" }}>
          <LivePlanningTab
            layoutFields={layoutFields}
            matches={payload.matches}
            completed={completed}
            matchResults={matchResults}
            onToggleDone={() => {}}
          />
        </div>,
        TABLE_CAPTURE_WIDTH,
        captures
      );
    }

    for (const entry of payload.page_map.final) {
      await renderAndCapture(
        root,
        host,
        captureKey("final", entry.index),
        <div style={{ width: TABLE_CAPTURE_WIDTH, background: "#ffffff", padding: "16px 20px" }}>
          <LiveFinalRankingTab
            meta={meta}
            matches={payload.matches}
            matchResults={matchResults}
            fields={payload.fields}
          />
        </div>,
        TABLE_CAPTURE_WIDTH,
        captures
      );
    }
  } finally {
    root.unmount();
    host.remove();
  }

  return captures;
}
