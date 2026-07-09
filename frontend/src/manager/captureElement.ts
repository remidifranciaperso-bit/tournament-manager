/**
 * Capture DOM → image sans dépendance externe.
 */

const SKIP_PROPS = new Set(["width", "height", "-webkit-locale"]);
const CAPTURE_TIMEOUT_MS = 20_000;

export interface DomCaptureOptions {
  height?: number;
  transparent?: boolean;
  format?: "png" | "jpeg";
}

function inlineNodeStyles(source: Element, target: Element): void {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    return;
  }

  const computed = window.getComputedStyle(source);
  let cssText = "";
  for (let index = 0; index < computed.length; index += 1) {
    const name = computed.item(index);
    if (!name || SKIP_PROPS.has(name)) continue;
    const value = computed.getPropertyValue(name);
    if (value) cssText += `${name}:${value};`;
  }
  target.style.cssText = cssText;

  if (source instanceof SVGElement && target instanceof SVGElement) {
    for (const attr of Array.from(source.attributes)) {
      if (attr.name === "class") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (targetChildren[index]) {
      inlineNodeStyles(sourceChildren[index], targetChildren[index]);
    }
  }
}

function cloneWithInlineStyles(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  inlineNodeStyles(node, clone);
  return clone;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      reject(new Error("Délai de capture dépassé."));
    }, CAPTURE_TIMEOUT_MS);

    image.decoding = "async";
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Impossible de rasteriser la capture."));
    };
    image.src = src;
  });
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
  const format = options.format ?? (transparent ? "png" : "jpeg");

  const clone = cloneWithInlineStyles(element);
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = "0";
  clone.style.padding = "0";
  clone.style.boxSizing = "border-box";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.transform = "none";
  if (transparent) {
    clone.style.background = "transparent";
  } else {
    clone.style.background = "#ffffff";
  }

  const xmlns = "http://www.w3.org/1999/xhtml";
  const serialized = new XMLSerializer().serializeToString(clone);
  const background = transparent ? "transparent" : "#ffffff";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    <div xmlns="${xmlns}" style="width:${width}px;height:${height}px;margin:0;padding:0;overflow:visible;background:${background};">
      ${serialized}
    </div>
  </foreignObject>
</svg>`;

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = await loadImage(svgUrl);

  const canvas = document.createElement("canvas");
  const ratio = 2;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  ctx.scale(ratio, ratio);
  if (!transparent) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(image, 0, 0, width, height);

  if (format === "png") {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}
