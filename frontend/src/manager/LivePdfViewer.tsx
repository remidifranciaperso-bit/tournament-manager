import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

GlobalWorkerOptions.workerSrc = pdfWorker;

/** Résolution minimale du bitmap (bord long) — rendu vectoriel net puis affichage fit. */
const MIN_BITMAP_LONG_EDGE = 4096;
const MAX_DEVICE_PIXEL_RATIO = 4;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

export function useLivePdfDocument(pdfBase64: string | undefined) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(pdfBase64));

  useEffect(() => {
    if (!pdfBase64) {
      setDoc(null);
      setError("PDF manquant.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const task = getDocument({
      data: base64ToUint8Array(pdfBase64),
      useSystemFonts: true,
    });

    task.promise
      .then((loaded) => {
        if (!cancelled) {
          setDoc(loaded);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [pdfBase64]);

  return { doc, error, loading };
}

interface LivePdfPageProps {
  doc: PDFDocumentProxy;
  /** Index de slide PPTX (0-based) = même index de page PDF. */
  slideIndex: number;
}

function LivePdfPage({ doc, slideIndex }: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  useBlockZoom(slotRef);

  const render = useCallback(async () => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    renderTaskRef.current?.cancel();

    const pageNumber = slideIndex + 1;
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });

    const fitScale = Math.min(
      slotW / baseViewport.width,
      slotH / baseViewport.height
    );
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

    const cssWidth = Math.floor(baseViewport.width * fitScale);
    const cssHeight = Math.floor(baseViewport.height * fitScale);

    const longEdge = Math.max(baseViewport.width, baseViewport.height);
    const minQualityScale = MIN_BITMAP_LONG_EDGE / longEdge;
    const renderScale = Math.max(fitScale * dpr, minQualityScale);

    const viewport = page.getViewport({ scale: renderScale });
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;

    const task = page.render({
      canvasContext: context,
      viewport,
      intent: "print",
    });
    renderTaskRef.current = task;
    await task.promise;
  }, [doc, slideIndex]);

  useEffect(() => {
    void render();
    const slot = slotRef.current;
    if (!slot) return;

    const observer = new ResizeObserver(() => {
      void render();
    });
    observer.observe(slot);

    return () => {
      observer.disconnect();
      renderTaskRef.current?.cancel();
    };
  }, [render]);

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-white"
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block shrink-0"
        draggable={false}
        style={{
          imageRendering: "auto",
          WebkitOptimizeContrast: true,
        }}
      />
    </div>
  );
}

interface LivePdfPagesStackProps {
  doc: PDFDocumentProxy;
  slideIndices: number[];
}

export function LivePdfPagesStack({
  doc,
  slideIndices,
}: LivePdfPagesStackProps) {
  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  return <LivePdfPage doc={doc} slideIndex={slideIndices[0]} />;
}

interface LivePdfViewerProps {
  pdfBase64: string;
  slideIndices: number[];
}

export function LivePdfViewer({ pdfBase64, slideIndices }: LivePdfViewerProps) {
  const { doc, error, loading } = useLivePdfDocument(pdfBase64);

  if (loading) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-white/40">
        Chargement du PDF…
      </p>
    );
  }

  if (error || !doc) {
    return (
      <p className="flex flex-1 items-center justify-center px-4 text-center text-sm text-red-400">
        {error ?? "Impossible d'afficher le PDF."}
      </p>
    );
  }

  return <LivePdfPagesStack doc={doc} slideIndices={slideIndices} />;
}
