/**
 * Capture écran WYSIWYG : rasterise le DOM tel qu'affiché par le navigateur.
 * html-to-image utilise un foreignObject SVG (= rendu natif Chrome/Safari).
 */

import { toPng } from "html-to-image";

const CAPTURE_TIMEOUT_MS = 30_000;

export interface DomCaptureOptions {
  format?: "png";
}

async function waitForStableLayout(element: HTMLElement): Promise<void> {
  let lastWidth = -1;
  let lastHeight = -1;
  let stableReads = 0;
  const started = Date.now();

  while (Date.now() - started < 8_000) {
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    if (
      width === lastWidth &&
      height === lastHeight &&
      width >= 120 &&
      height >= 120
    ) {
      stableReads += 1;
      if (stableReads >= 5) {
        return;
      }
    } else {
      stableReads = 0;
    }

    lastWidth = width;
    lastHeight = height;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

function isDataUrlMostlyBlank(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const step = Math.max(4, Math.floor(image.width / 36));
      canvas.width = Math.ceil(image.width / step);
      canvas.height = Math.ceil(image.height / step);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(true);
        return;
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      let nonWhite = 0;
      let samples = 0;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          samples += 1;
          const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
          if (r < 245 || g < 245 || b < 245) {
            nonWhite += 1;
          }
        }
      }

      resolve(samples === 0 || nonWhite / samples < 0.004);
    };
    image.onerror = () => resolve(true);
    image.src = dataUrl;
  });
}

export async function captureElementImage(
  element: HTMLElement,
  _options: DomCaptureOptions = {}
): Promise<string> {
  await document.fonts.ready;
  await waitForStableLayout(element);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const captureWidth = Math.max(element.scrollWidth, element.offsetWidth);
  const captureHeight = Math.max(element.scrollHeight, element.offsetHeight);

  const capturePromise = toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    width: captureWidth,
    height: captureHeight,
    backgroundColor: "#ffffff",
    includeQueryParams: true,
    skipAutoScale: false,
  });

  const timeoutPromise = new Promise<string>((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Délai de capture dépassé.")),
      CAPTURE_TIMEOUT_MS
    );
  });

  const dataUrl = await Promise.race([capturePromise, timeoutPromise]);

  if (await isDataUrlMostlyBlank(dataUrl)) {
    throw new Error("La capture écran est vide.");
  }

  return dataUrl;
}
