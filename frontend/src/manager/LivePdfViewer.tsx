import { useEffect, useMemo, useRef, type RefObject } from "react";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function usePdfBlobUrl(pdfBase64: string | undefined): string | null {
  const blobUrl = useMemo(() => {
    if (!pdfBase64) return null;
    const bytes = base64ToUint8Array(pdfBase64);
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [pdfBase64]);

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
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const blockGesture = (event: Event) => {
      event.preventDefault();
    };

    const blockMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
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

function buildPdfPageUrl(blobUrl: string, slideIndex: number): string {
  const page = slideIndex + 1;
  // Lecteur PDF natif du navigateur (PDFium / Preview intégré) — même rendu
  // que le PDF Engine, emojis compris. Pas de rasterisation pdf.js canvas.
  return `${blobUrl}#page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`;
}

interface LivePdfViewerProps {
  pdfBase64: string;
  slideIndices: number[];
}

export function LivePdfViewer({ pdfBase64, slideIndices }: LivePdfViewerProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const blobUrl = usePdfBlobUrl(pdfBase64);

  useBlockZoom(slotRef);

  if (!blobUrl) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-white/40">
        Chargement du PDF…
      </p>
    );
  }

  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  const slideIndex = slideIndices[0];
  const pageUrl = buildPdfPageUrl(blobUrl, slideIndex);

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 touch-none select-none flex-col overflow-hidden bg-white"
      style={{ touchAction: "none" }}
    >
      <embed
        key={slideIndex}
        src={pageUrl}
        type="application/pdf"
        title={`Page ${slideIndex + 1}`}
        className="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
}
