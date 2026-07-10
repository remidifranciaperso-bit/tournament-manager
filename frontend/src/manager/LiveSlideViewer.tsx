import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { fieldValue, isDynamicField } from "./liveFields";
import type { LiveLayout, LiveLayoutField } from "./liveTypes";

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

interface LiveSlideViewerProps {
  templateId: string;
  slideIndex: number;
  fields: Record<string, string>;
  layoutFields: LiveLayoutField[];
}

function LiveSlideViewer({
  templateId,
  slideIndex,
  fields,
  layoutFields,
}: LiveSlideViewerProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(
    null
  );

  useBlockZoom(slotRef);

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
    (field) =>
      isDynamicField(field.key) && fieldValue(fields, field.key).length > 0
  );

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
          src={maskSrc}
          alt={`Slide ${slideIndex + 1}`}
          draggable={false}
          className="block h-full w-full select-none"
        />

        {renderSize &&
          dynamicFields.map((field) => (
            <div
              key={field.key}
              className="absolute flex items-center justify-center overflow-hidden whitespace-nowrap font-sans font-bold leading-none text-black"
              style={{
                left: `${field.left}%`,
                top: `${field.top}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
                fontSize: `${Math.max(
                  7,
                  (field.height / 100) * renderSize.h * 0.58
                )}px`,
              }}
              data-field={field.key}
            >
              {fieldValue(fields, field.key)}
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
  layout: LiveLayout;
}

export function LiveSlidesStack({
  templateId,
  slideIndices,
  fields,
  layout,
}: LiveSlidesStackProps) {
  if (slideIndices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aucune page disponible pour cet onglet.
      </p>
    );
  }

  const slideIndex = slideIndices[0];

  return (
    <LiveSlideViewer
      templateId={templateId}
      slideIndex={slideIndex}
      fields={fields}
      layoutFields={layout[String(slideIndex)] ?? []}
    />
  );
}

interface LiveTemplateViewerProps {
  templateId: string;
  fields: Record<string, string>;
  layout: LiveLayout;
  slideIndices: number[];
}

export function LiveTemplateViewer({
  templateId,
  fields,
  layout,
  slideIndices,
}: LiveTemplateViewerProps) {
  return (
    <LiveSlidesStack
      templateId={templateId}
      slideIndices={slideIndices}
      fields={fields}
      layout={layout}
    />
  );
}
