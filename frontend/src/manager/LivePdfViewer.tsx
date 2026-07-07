import { useEffect, useMemo, useRef, type RefObject } from "react";

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
}

function LivePdfPage({ pageUrl }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  useBlockZoom(slotRef);

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white"
      style={{ touchAction: "none" }}
    >
      <img
        key={pageUrl}
        src={pageUrl}
        alt=""
        decoding="async"
        draggable={false}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export interface LivePdfViewerProps {
  liveToken: string;
  prefetchIndices: number[];
  slideIndices: number[];
}

export function LivePdfViewer({
  liveToken,
  prefetchIndices,
  slideIndices,
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

  return <LivePdfPage pageUrl={pageUrl} />;
}

export function downloadEnginePdf(liveToken: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = `/api/live/${liveToken}/pdf`;
  anchor.download = filename;
  anchor.click();
}
