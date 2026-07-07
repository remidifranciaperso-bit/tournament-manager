import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useCallback, useEffect, useRef, useState } from "react";

GlobalWorkerOptions.workerSrc = pdfWorker;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

    const task = getDocument({ data: base64ToUint8Array(pdfBase64) });

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
    const scale = Math.min(
      slotW / baseViewport.width,
      slotH / baseViewport.height
    );
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const task = page.render({ canvasContext: context, viewport });
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
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white"
    >
      <canvas ref={canvasRef} className="block max-h-full max-w-full" />
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
