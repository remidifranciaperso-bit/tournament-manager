/**
 * Capture DOM → image via html2canvas (fiable pour export PDF).
 */

import html2canvas from "html2canvas";

const CAPTURE_TIMEOUT_MS = 25_000;

export interface DomCaptureOptions {
  width?: number;
  height?: number;
  transparent?: boolean;
  format?: "png" | "jpeg";
}

function isCanvasMostlyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const step = Math.max(4, Math.floor(canvas.width / 48));
  let nonWhite = 0;
  let samples = 0;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      samples += 1;
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      if (r < 248 || g < 248 || b < 248) {
        nonWhite += 1;
      }
    }
  }

  return samples === 0 || nonWhite / samples < 0.002;
}

export async function domToPng(
  element: HTMLElement,
  width: number,
  options: DomCaptureOptions = {}
): Promise<string> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const height = Math.max(
    options.height ?? 0,
    element.offsetHeight,
    element.scrollHeight,
    Math.round(element.getBoundingClientRect().height),
    1
  );
  const transparent = options.transparent ?? false;
  const format = options.format ?? "jpeg";

  const capturePromise = html2canvas(element, {
    backgroundColor: transparent ? null : "#ffffff",
    scale: 2,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    logging: false,
    useCORS: true,
    allowTaint: false,
    imageTimeout: CAPTURE_TIMEOUT_MS,
    removeContainer: true,
  });

  const timeoutPromise = new Promise<HTMLCanvasElement>((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Délai de capture dépassé.")),
      CAPTURE_TIMEOUT_MS
    );
  });

  const canvas = await Promise.race([capturePromise, timeoutPromise]);

  if (isCanvasMostlyBlank(canvas)) {
    throw new Error(
      "La capture est vide. Réessayez depuis un onglet tableau du Manager."
    );
  }

  if (format === "png") {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}
