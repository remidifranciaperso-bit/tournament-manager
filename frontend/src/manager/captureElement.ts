/**
 * Capture DOM → PNG sans dépendance externe.
 */

const SKIP_PROPS = new Set(["width", "height", "-webkit-locale"]);
const CAPTURE_TIMEOUT_MS = 20_000;

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
  width: number
): Promise<string> {
  await document.fonts.ready;

  const clone = cloneWithInlineStyles(element);
  clone.style.width = `${width}px`;
  clone.style.background = "#ffffff";
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";

  const height = Math.max(element.scrollHeight, element.offsetHeight, 1);
  clone.style.height = `${height}px`;

  const xmlns = "http://www.w3.org/1999/xhtml";
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="${xmlns}" style="width:${width}px;height:${height}px;background:#ffffff;">
      ${serialized}
    </div>
  </foreignObject>
</svg>`;

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = await loadImage(svgUrl);

  const canvas = document.createElement("canvas");
  const ratio = 1.5;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}
