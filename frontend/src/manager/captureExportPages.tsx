import { type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LiveBracketSlide } from "./LiveBracketSlide";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { domToPng } from "./captureElement";
import type { LivePdfExportPayload } from "./LivePdfViewer";
import type { LiveTournamentMeta } from "./liveTypes";
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
  captures: Record<string, string>,
  options?: {
    transparent?: boolean;
    format?: "png" | "jpeg";
    findTarget?: (host: HTMLDivElement) => HTMLElement | null;
  }
): Promise<void> {
  flushSync(() => {
    root.render(<div data-capture-root>{node}</div>);
  });

  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 300));

  const target =
    options?.findTarget?.(host) ??
    (host.querySelector("[data-capture-root]") as HTMLElement | null);
  if (!target) {
    throw new Error(`Capture impossible pour ${key}.`);
  }

  const width = target.offsetWidth || BRACKET_CAPTURE_WIDTH;
  const height = target.offsetHeight || target.scrollHeight;

  captures[key] = await domToPng(target, width, {
    height,
    transparent: options?.transparent,
    format: options?.format,
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
  host.style.cssText =
    "position:fixed;left:-14000px;top:0;z-index:-1;opacity:1;pointer-events:none;background:#fff";
  document.body.appendChild(host);
  const root = createRoot(host);

  const bracketCaptureOptions = {
    transparent: true,
    format: "png" as const,
    findTarget: (container: HTMLDivElement) =>
      container.querySelector("[data-bracket-slide]") as HTMLElement | null,
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
          forExport
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
          forExport
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
        { format: "jpeg" }
      );
    }
  } finally {
    root.unmount();
    host.remove();
  }

  return captures;
}
