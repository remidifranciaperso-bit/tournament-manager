/**
 * Capture DOM → image via html2canvas.
 */

import html2canvas from "html2canvas";

const CAPTURE_TIMEOUT_MS = 25_000;

export interface DomCaptureOptions {
  scale?: number;
  format?: "png" | "jpeg";
}

function isCanvasMostlyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const step = Math.max(4, Math.floor(canvas.width / 40));
  let nonWhite = 0;
  let samples = 0;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      samples += 1;
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      if (r < 245 || g < 245 || b < 245) {
        nonWhite += 1;
      }
    }
  }

  return samples === 0 || nonWhite / samples < 0.004;
}

export async function captureElementImage(
  element: HTMLElement,
  options: DomCaptureOptions = {}
): Promise<string> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const scale = options.scale ?? 2;
  const format = options.format ?? "jpeg";

  const capturePromise = html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    logging: false,
    useCORS: true,
    allowTaint: true,
    imageTimeout: CAPTURE_TIMEOUT_MS,
  });

  const timeoutPromise = new Promise<HTMLCanvasElement>((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Délai de capture dépassé.")),
      CAPTURE_TIMEOUT_MS
    );
  });

  const canvas = await Promise.race([capturePromise, timeoutPromise]);

  if (isCanvasMostlyBlank(canvas)) {
    throw new Error("La capture est vide.");
  }

  if (format === "png") {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}
