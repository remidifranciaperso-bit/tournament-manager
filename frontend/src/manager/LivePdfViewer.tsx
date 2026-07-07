import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  emojiOverlayFields,
  overlayColors,
  overlayLabel,
} from "./liveEmojiOverlay";
import type { LiveLayout, LiveLayoutField } from "./liveTypes";

GlobalWorkerOptions.workerSrc = pdfWorker;

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

function useLiveLayout(templateId: string) {
  const [layout, setLayout] = useState<LiveLayout | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/live-templates/${templateId}/layout.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LiveLayout | null) => {
        if (!cancelled && data) setLayout(data);
      })
      .catch(() => {
        /* silencieux */
      });

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return layout;
}

function useLivePdfDocument(pdfBase64: string | undefined) {
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
  slideIndex: number;
  layoutFields: LiveLayoutField[];
  fields: Record<string, string>;
}

function LivePdfPage({
  doc,
  slideIndex,
  layoutFields,
  fields,
}: LivePdfPageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [displaySize, setDisplaySize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useBlockZoom(slotRef);

  const overlays = emojiOverlayFields(layoutFields, fields);

  const render = useCallback(async () => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    renderTaskRef.current?.cancel();

    const page = await doc.getPage(slideIndex + 1);
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

    setDisplaySize({ width: cssWidth, height: cssHeight });

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

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
      <div
        className="relative shrink-0"
        style={
          displaySize
            ? { width: displaySize.width, height: displaySize.height }
            : undefined
        }
      >
        <canvas ref={canvasRef} className="block" draggable={false} />

        {displaySize &&
          overlays.map((field) => {
            const colors = overlayColors(field.key);
            const label = overlayLabel(field.key, fields[field.key]);
            if (!label) return null;

            return (
              <div
                key={field.key}
                className="absolute flex items-center justify-center overflow-hidden whitespace-nowrap font-sans font-bold leading-none"
                style={{
                  left: `${field.left}%`,
                  top: `${field.top}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  backgroundColor: colors.backgroundColor,
                  color: colors.color,
                  fontSize: `${Math.max(
                    7,
                    (field.height / 100) * displaySize.height * 0.62
                  )}px`,
                }}
              >
                {label}
              </div>
            );
          })}
      </div>
    </div>
  );
}

interface LivePdfViewerProps {
  pdfBase64: string;
  templateId: string;
  fields: Record<string, string>;
  slideIndices: number[];
}

export function LivePdfViewer({
  pdfBase64,
  templateId,
  fields,
  slideIndices,
}: LivePdfViewerProps) {
  const { doc, error, loading } = useLivePdfDocument(pdfBase64);
  const layout = useLiveLayout(templateId);

  if (loading || !layout) {
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

  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  const slideIndex = slideIndices[0];
  const layoutFields = layout[String(slideIndex)] ?? [];

  return (
    <LivePdfPage
      doc={doc}
      slideIndex={slideIndex}
      layoutFields={layoutFields}
      fields={fields}
    />
  );
}
