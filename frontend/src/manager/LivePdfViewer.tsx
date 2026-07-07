import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { PlanningCheckboxOverlay } from "./planningOverlays";

function useBlockZoom(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
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
  }, [containerRef]);
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

function LivePdfPage({ pageUrl, checkboxes = [] }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(
    null
  );

  useBlockZoom(slotRef);

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
      w: Math.floor(img.naturalWidth * fit),
      h: Math.floor(img.naturalHeight * fit),
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
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white"
      style={{ touchAction: "none" }}
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
          className="block h-full w-full select-none object-contain"
        />

        {renderSize &&
          checkboxes.map((box, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={box.checked}
              onClick={box.onToggle}
              className="absolute flex items-center justify-center border border-black/25 bg-white/80 transition hover:bg-lime/20"
              style={{
                left: `${box.left}%`,
                top: `${box.top}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
            >
              <span
                className="font-bold leading-none text-black"
                style={{
                  fontSize: `${Math.max(10, (box.height / 100) * renderSize.h * 0.62)}px`,
                }}
              >
                {box.checked ? "☑" : "☐"}
              </span>
            </button>
          ))}
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
