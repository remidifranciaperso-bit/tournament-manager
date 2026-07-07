import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveLayout, LiveLayoutField } from "./liveTypes";

interface LiveSlideViewerProps {
  templateId: string;
  slideIndex: number;
  fields: Record<string, string>;
  layoutFields?: LiveLayoutField[];
}

function fieldValue(fields: Record<string, string>, key: string): string {
  return fields[key] ?? "";
}

function isStaticWinLoseKey(key: string): boolean {
  return (
    key.startsWith("WIN_") ||
    key.startsWith("LOSE_") ||
    key.startsWith("SECOND_")
  );
}

export function LiveSlideViewer({
  templateId,
  slideIndex,
  fields,
  layoutFields = [],
}: LiveSlideViewerProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(
    null
  );

  const maskSrc = `/live-templates/${templateId}/${slideIndex}.png`;

  const computeScale = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    const img = slot.querySelector("img");
    if (!img?.naturalWidth || !img?.naturalHeight) return;

    const fit = Math.min(
      slotW / img.naturalWidth,
      slotH / img.naturalHeight
    );
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
  }, [maskSrc, computeScale]);

  const dynamicFields = layoutFields.filter(
    (field) => fieldValue(fields, field.key) && !isStaticWinLoseKey(field.key)
  );

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white"
    >
      <div
        className="relative shrink-0 origin-center"
        style={
          renderSize
            ? { width: renderSize.w, height: renderSize.h }
            : { width: "100%", height: "100%" }
        }
      >
        <img
          src={maskSrc}
          alt={`Slide ${slideIndex + 1}`}
          draggable={false}
          className="block h-full w-full select-none"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.opacity = "0.35";
          }}
        />

        {dynamicFields.map((field) => (
          <div
            key={field.key}
            className="absolute overflow-hidden bg-white/95 px-[2%] text-left font-sans font-semibold leading-none text-black"
            style={{
              left: `${field.left}%`,
              top: `${field.top}%`,
              width: `${field.width}%`,
              height: `${field.height}%`,
              fontSize: `${Math.max(
                7,
                (field.height / 100) * (renderSize?.h ?? 400) * 0.55
              )}px`,
            }}
            title={field.key}
          >
            <span className="block truncate">{fieldValue(fields, field.key)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LiveSlidesStackProps {
  templateId: string;
  slideIndices: number[];
  fields: Record<string, string>;
  layout?: LiveLayout;
}

function useLiveLayout(templateId: string, layout?: LiveLayout) {
  const [loaded, setLoaded] = useState<LiveLayout | null>(layout ?? null);

  useEffect(() => {
    if (layout) {
      setLoaded(layout);
      return;
    }

    let cancelled = false;
    void fetch(`/live-templates/${templateId}/layout.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LiveLayout | null) => {
        if (!cancelled && data) setLoaded(data);
      })
      .catch(() => {
        /* silencieux */
      });

    return () => {
      cancelled = true;
    };
  }, [templateId, layout]);

  return loaded;
}

export function LiveSlidesStack({
  templateId,
  slideIndices,
  fields,
  layout,
}: LiveSlidesStackProps) {
  const resolvedLayout = useLiveLayout(templateId, layout);

  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  const activeIndex = slideIndices[0];

  if (!resolvedLayout) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-white/40">
        Chargement du template…
      </p>
    );
  }

  return (
    <LiveSlideViewer
      templateId={templateId}
      slideIndex={activeIndex}
      fields={fields}
      layoutFields={resolvedLayout[String(activeIndex)] ?? []}
    />
  );
}
