import { useEffect, useMemo, useRef, type RefObject } from "react";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function usePagePdfUrl(pagePdfBase64: string | undefined): string | null {
  const blobUrl = useMemo(() => {
    if (!pagePdfBase64) return null;
    const bytes = base64ToUint8Array(pagePdfBase64);
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [pagePdfBase64]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return blobUrl;
}

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
  pagePdfBase64: string;
  pageSize?: { width: number; height: number };
}

function LivePdfPage({ pagePdfBase64, pageSize }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const pageUrl = usePagePdfUrl(pagePdfBase64);

  useBlockZoom(slotRef);

  if (!pageUrl) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-white/40">
        Page indisponible.
      </p>
    );
  }

  const aspectRatio =
    pageSize && pageSize.width > 0 && pageSize.height > 0
      ? `${pageSize.width} / ${pageSize.height}`
      : "297 / 210";

  const src = `${pageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`;

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white p-1 sm:p-2"
      style={{ touchAction: "none" }}
    >
      <div
        className="h-full max-h-full w-full max-w-full overflow-hidden"
        style={{ aspectRatio }}
      >
        <iframe
          key={pagePdfBase64.slice(0, 48)}
          src={src}
          title="Page tournoi"
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}

export interface LivePdfViewerProps {
  pagePdfs: Record<string, string>;
  pageSizes?: Record<string, { width: number; height: number }>;
  slideIndices: number[];
}

export function LivePdfViewer({
  pagePdfs,
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
  const pagePdf = pagePdfs[String(slideIndex)];
  const pageSize = pageSizes?.[String(slideIndex)];

  if (!pagePdf) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-white/40">
        Page {slideIndex + 1} indisponible.
      </p>
    );
  }

  return <LivePdfPage pagePdfBase64={pagePdf} pageSize={pageSize} />;
}

/** Télécharge le PDF Engine complet (export fin de tournoi). */
export function downloadEnginePdf(pdfBase64: string, filename: string): void {
  const bytes = base64ToUint8Array(pdfBase64);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
