import { useCallback, useEffect, useRef, useState } from "react";

interface PdfPagesStackProps {
  pageImages: Record<string, string>;
  /** Indices de slide PPTX (0-based), clés dans page_images. */
  pageIndices: number[];
  /** fit = dézoom pour tenir dans la fenêtre, sans scroll (essai). */
  fitMode?: "fit" | "scroll";
}

function lookupPageImage(
  pageImages: Record<string, string>,
  index: number
): string | undefined {
  return pageImages[String(index)] ?? pageImages[index as unknown as string];
}

function FitPageImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(
    null
  );

  const computeLayout = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const img = slot.querySelector("img");
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    const scale = Math.min(slotW / img.naturalWidth, slotH / img.naturalHeight);
    setLayout({
      width: Math.floor(img.naturalWidth * scale),
      height: Math.floor(img.naturalHeight * scale),
    });
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const img = slot.querySelector("img");
    if (!img) return;

    const onLoad = () => computeLayout();
    img.addEventListener("load", onLoad);
    if (img.complete) onLoad();

    const observer = new ResizeObserver(() => computeLayout());
    observer.observe(slot);

    return () => {
      img.removeEventListener("load", onLoad);
      observer.disconnect();
    };
  }, [src, computeLayout]);

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white"
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="block max-h-full max-w-full object-contain"
        style={
          layout
            ? { width: layout.width, height: layout.height }
            : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
        }
      />
    </div>
  );
}

export function PdfPagesStack({
  pageImages,
  pageIndices,
  fitMode = "fit",
}: PdfPagesStackProps) {
  if (pageIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  if (fitMode === "scroll") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {pageIndices.map((index) => {
          const src = lookupPageImage(pageImages, index);
          if (!src) {
            return (
              <p
                key={index}
                className="py-8 text-center text-sm text-white/40"
              >
                Page {index + 1} indisponible.
              </p>
            );
          }
          return (
            <img
              key={index}
              src={`data:image/png;base64,${src}`}
              alt={`Page ${index + 1}`}
              className="block w-full"
              draggable={false}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {pageIndices.map((index) => {
        const src = lookupPageImage(pageImages, index);
        if (!src) {
          return (
            <p
              key={index}
              className="flex flex-1 items-center justify-center text-sm text-white/40"
            >
              Page {index + 1} indisponible.
            </p>
          );
        }
        return (
          <FitPageImage
            key={index}
            src={`data:image/png;base64,${src}`}
            alt={`Page ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
