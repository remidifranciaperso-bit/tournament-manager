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

function normalizeCloneForCapture(clonedRoot: HTMLElement): void {
  clonedRoot.querySelectorAll<HTMLElement>(".line-clamp-2").forEach((node) => {
    node.style.display = "block";
    node.style.overflow = "visible";
    node.style.webkitLineClamp = "unset";
    node.style.lineClamp = "unset";
    node.style.whiteSpace = "normal";
    node.style.wordBreak = "break-word";
  });

  clonedRoot.querySelectorAll<HTMLElement>("[data-export-capture]").forEach((node) => {
    node.style.boxShadow = "none";
    node.style.transform = "none";
  });
}

export async function captureElementImage(
  element: HTMLElement,
  options: DomCaptureOptions = {}
): Promise<string> {
  await document.fonts.ready;
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const scale = options.scale ?? 2;
  const format = options.format ?? "jpeg";
  const width = Math.max(1, element.offsetWidth);
  const height = Math.max(1, element.offsetHeight);

  const capturePromise = html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    width,
    height,
    logging: false,
    useCORS: true,
    allowTaint: true,
    imageTimeout: CAPTURE_TIMEOUT_MS,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    onclone: (_clonedDoc, clonedElement) => {
      normalizeCloneForCapture(clonedElement as HTMLElement);
    },
  });

  const timeoutPromise = new Promise<HTMLCanvasElement>((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Délai de capture dépassé.")),
      CAPTURE_TIMEOUT_MS
    );
  });

  const canvas = await Promise.race([capturePromise, timeoutPromise]);

  if (isCanvasMostlyBlank(canvas)) {
    throw new Error("La capture écran est vide.");
  }

  if (format === "png") {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}
