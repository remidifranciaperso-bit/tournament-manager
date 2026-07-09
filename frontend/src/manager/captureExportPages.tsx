import { type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { SLIDE_ASPECT } from "./bracketSlideLayout";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { domToPng } from "./captureElement";
import type { LivePdfExportPayload } from "./LivePdfViewer";
import type { LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

const BRACKET_CAPTURE_WIDTH = 1100;
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
  captures: Record<string, string>,
  options?: {
    findTarget?: (host: HTMLDivElement) => HTMLElement | null;
    width?: number;
    height?: number;
  }
): Promise<void> {
  flushSync(() => {
    root.render(<div data-capture-root>{node}</div>);
  });

  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 450));

  const target =
    options?.findTarget?.(host) ??
    (host.querySelector("[data-capture-root]") as HTMLElement | null);
  if (!target) {
    throw new Error(`Capture impossible pour ${key}.`);
  }

  const width =
    options?.width ??
    (target.offsetWidth ||
      Number.parseInt(target.getAttribute("data-capture-width") ?? "", 10) ||
      BRACKET_CAPTURE_WIDTH);
  const height =
    options?.height ??
    (target.offsetHeight ||
      target.scrollHeight ||
      Number.parseInt(target.getAttribute("data-capture-height") ?? "", 10) ||
      Math.round(width / SLIDE_ASPECT));

  captures[key] = await domToPng(target, width, {
    height,
    format: "jpeg",
  });
}

export async function captureManagerExportPages(
  payload: LivePdfExportPayload,
  meta: LiveTournamentMeta
): Promise<Record<string, string>> {
  const layout = await fetchTemplateLayout(payload.template_id);
  const captures: Record<string, string> = {};
  const matchResults = asMatchResults(payload.match_results);

  const host = document.createElement("div");
  host.setAttribute("data-export-capture-host", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;z-index:2147483647;background:#fff;pointer-events:none;overflow:visible";
  document.body.appendChild(host);
  const root = createRoot(host);

  const bracketHeight = Math.round(BRACKET_CAPTURE_WIDTH / SLIDE_ASPECT);
  const bracketCaptureOptions = {
    findTarget: (container: HTMLDivElement) =>
      container.querySelector("[data-bracket-slide]") as HTMLElement | null,
    width: BRACKET_CAPTURE_WIDTH,
    height: bracketHeight,
  };

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
        captures,
        bracketCaptureOptions
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
        captures,
        bracketCaptureOptions
      );
    }

    for (const entry of payload.page_map.final) {
      await renderAndCapture(
        root,
        host,
        captureKey("final", entry.index),
        <div
          data-final-capture
          style={{
            width: TABLE_CAPTURE_WIDTH,
            background: "#ffffff",
            padding: "16px 20px",
          }}
        >
          <LiveFinalRankingTab
            meta={meta}
            matches={payload.matches}
            matchResults={matchResults}
            fields={payload.fields}
          />
        </div>,
        captures,
        {
          findTarget: (container) =>
            container.querySelector("[data-final-capture]") as HTMLElement | null,
        }
      );
    }
  } finally {
    root.unmount();
    host.remove();
  }

  return captures;
}
