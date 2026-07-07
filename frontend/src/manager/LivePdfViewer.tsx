import { useEffect, useRef, type RefObject } from "react";

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

interface LivePdfPageProps {
  pageUrl: string;
  pageSize?: { width: number; height: number };
}

function LivePdfPage({ pageUrl, pageSize }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  useBlockZoom(slotRef);

  const aspectRatio =
    pageSize && pageSize.width > 0 && pageSize.height > 0
      ? `${pageSize.width} / ${pageSize.height}`
      : "297 / 210";

  const src = `${pageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`;

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white"
      style={{ touchAction: "none" }}
    >
      <div
        className="h-full max-h-full w-full max-w-full overflow-hidden"
        style={{ aspectRatio }}
      >
        <iframe
          key={pageUrl}
          src={src}
          title="Page tournoi"
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}

export interface LivePdfViewerProps {
  liveToken: string;
  pageSizes?: Record<string, { width: number; height: number }>;
  slideIndices: number[];
}

export function LivePdfViewer({
  liveToken,
  pageSizes,
  slideIndices,
}: LivePdfViewerProps) {
  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  const slideIndex = slideIndices[0];
  const pageSize = pageSizes?.[String(slideIndex)];
  const pageUrl = `/api/live/${liveToken}/page/${slideIndex}`;

  return <LivePdfPage pageUrl={pageUrl} pageSize={pageSize} />;
}

export function downloadEnginePdf(liveToken: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = `/api/live/${liveToken}/pdf`;
  anchor.download = filename;
  anchor.click();
}
