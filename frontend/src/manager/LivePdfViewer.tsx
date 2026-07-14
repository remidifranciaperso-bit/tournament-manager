import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { buildExportFormData } from "./captureExportPages";
import type { ExportPhase } from "./exportCapture";
import type { PlanningCheckboxOverlay } from "./planningOverlays";
import type { LiveLayoutField, LiveMatch, LivePageMap, LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

export interface LivePdfExportPayload {
  page_map: LivePageMap;
  template_id: string;
  matches: LiveMatch[];
  match_results: Record<string, Pick<StoredMatchResult, "winner" | "loser" | "display">>;
  completed: string[];
  fields: Record<string, string>;
  planning_layout: Record<string, LiveLayoutField[]>;
  nb_equipes: number;
  captures?: Record<string, string>;
}

function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function useBlockZoom(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const blockWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    const blockGesture = (event: Event) => event.preventDefault();
    const blockMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    el.addEventListener("wheel", blockWheelZoom, { passive: false });
    el.addEventListener("gesturestart", blockGesture, { passive: false });
    el.addEventListener("gesturechange", blockGesture, { passive: false });
    el.addEventListener("gestureend", blockGesture, { passive: false });
    el.addEventListener("touchmove", blockMultiTouch, { passive: false });

    return () => {
      el.removeEventListener("wheel", blockWheelZoom);
      el.removeEventListener("gesturestart", blockGesture);
      el.removeEventListener("gesturechange", blockGesture);
      el.removeEventListener("gestureend", blockGesture);
      el.removeEventListener("touchmove", blockMultiTouch);
    };
  }, [containerRef, enabled]);
}

function pagePngUrl(liveToken: string, slideIndex: number): string {
  return `/api/live/${liveToken}/page/${slideIndex}.png`;
}

function usePrefetchPages(liveToken: string, indices: number[]) {
  const prefetched = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const index of indices) {
      if (prefetched.current.has(index)) continue;
      prefetched.current.add(index);
      const img = new Image();
      img.decoding = "async";
      img.src = pagePngUrl(liveToken, index);
    }
  }, [liveToken, indices]);
}

interface LivePdfPageProps {
  pageUrl: string;
  checkboxes?: PlanningCheckboxOverlay[];
}

/** Compense le centrage flex + métriques fonte du ✓ vs la ☐ du PDF. */
const CHECK_MARK_UPSHIFT_RATIO = 0.16;

export function LivePdfPage({ pageUrl, checkboxes = [] }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const interactive = checkboxes.length > 0;

  useBlockZoom(slotRef, !interactive);

  const computeScale = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    const img = slot.querySelector("img");
    if (!img?.naturalWidth || !img?.naturalHeight) return;

    const fit = Math.min(slotW / img.naturalWidth, slotH / img.naturalHeight);
    setRenderSize({
      w: img.naturalWidth * fit,
      h: img.naturalHeight * fit,
    });
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const img = slot.querySelector("img");
    if (!img) return;

    const onLoad = () => computeScale();
    img.addEventListener("load", onLoad);
    if (img.complete) onLoad();

    const observer = new ResizeObserver(() => computeScale());
    observer.observe(slot);

    return () => {
      img.removeEventListener("load", onLoad);
      observer.disconnect();
    };
  }, [pageUrl, computeScale]);

  return (
    <div
      ref={slotRef}
      className={[
        "flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden bg-white",
        interactive ? "touch-manipulation" : "touch-none",
      ].join(" ")}
      style={interactive ? undefined : { touchAction: "none" }}
    >
      <div
        className="relative shrink-0"
        style={
          renderSize
            ? { width: renderSize.w, height: renderSize.h }
            : { width: "100%", height: "100%" }
        }
      >
        <img
          key={pageUrl}
          src={pageUrl}
          alt=""
          decoding="async"
          draggable={false}
          className="block max-h-full max-w-full select-none object-contain"
          style={{
            width: renderSize?.w,
            height: renderSize?.h,
            pointerEvents: interactive ? "none" : "auto",
          }}
        />

        {renderSize &&
          checkboxes.map((box) => {
            const markSize = Math.max(
              10,
              Math.min(
                (box.height / 100) * renderSize.h * 0.72,
                (box.width / 100) * renderSize.w * 0.72
              )
            );

            const cellHeightPx = (box.height / 100) * renderSize.h;
            const checkOffsetY = Math.max(
              1.5,
              cellHeightPx * CHECK_MARK_UPSHIFT_RATIO
            );

            return (
              <button
                key={box.code}
                type="button"
                aria-pressed={box.checked}
                aria-label={box.checked ? "Match terminé" : "Marquer terminé"}
                onClick={(event) => {
                  event.stopPropagation();
                  box.onToggle();
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                }}
                className="absolute z-20 m-0 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none"
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                }}
              >
                {box.checked ? (
                  <span
                    className="pointer-events-none block font-bold leading-none text-black"
                    style={{
                      fontSize: `${markSize}px`,
                      transform: `translateY(-${checkOffsetY}px)`,
                    }}
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export interface LivePdfViewerProps {
  liveToken: string;
  prefetchIndices: number[];
  slideIndices: number[];
  checkboxes?: PlanningCheckboxOverlay[];
}

export function LivePdfViewer({
  liveToken,
  prefetchIndices,
  slideIndices,
  checkboxes,
}: LivePdfViewerProps) {
  usePrefetchPages(liveToken, prefetchIndices);

  const pageUrl = useMemo(() => {
    if (slideIndices.length === 0) return null;
    return pagePngUrl(liveToken, slideIndices[0]);
  }, [liveToken, slideIndices]);

  if (!pageUrl) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  return <LivePdfPage pageUrl={pageUrl} checkboxes={checkboxes} />;
}

export function downloadEnginePdf(liveToken: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = `/api/live/${liveToken}/pdf`;
  anchor.download = filename;
  anchor.click();
}

function downloadViaHiddenFrame(url: string): void {
  const frame = document.createElement("iframe");
  frame.style.cssText = "display:none;width:0;height:0;border:0";
  frame.src = url;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120_000);
}

export async function downloadTournamentExportPdf(
  liveToken: string,
  _filename: string,
  payload: LivePdfExportPayload,
  capturePages: () => Promise<Record<string, string>>,
  onPhase?: (phase: ExportPhase) => void
): Promise<void> {
  onPhase?.("capture");
  let captures: Record<string, string>;
  try {
    captures = await capturePages();
  } catch (error) {
    onPhase?.("idle");
    throw error;
  }

  if (Object.keys(captures).length === 0) {
    onPhase?.("idle");
    throw new Error("Aucune capture Manager n'a pu être générée.");
  }

  onPhase?.("upload");

  const { captures: _omit, ...payloadWithoutCaptures } = payload;
  const form = buildExportFormData(
    { ...payloadWithoutCaptures },
    captures
  );

  const res = await fetch(`/api/live/${liveToken}/pdf/export`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { detail?: string };
      detail = json.detail ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      detail || "Impossible de générer le PDF export du tournoi."
    );
  }

  const result = (await res.json()) as { download_url?: string };
  const downloadUrl = result.download_url ?? `/api/live/${liveToken}/pdf/export`;
  downloadViaHiddenFrame(downloadUrl);
  onPhase?.("idle");
}
