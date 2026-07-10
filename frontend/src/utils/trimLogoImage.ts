const WHITE_THRESHOLD = 245;
const ALPHA_THRESHOLD = 16;
const TRIM_MARGIN_PX = 2;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire le logo."));
    img.src = url;
  });
}

function findContentBounds(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const { data } = context.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a < ALPHA_THRESHOLD) continue;
      if (
        r >= WHITE_THRESHOLD &&
        g >= WHITE_THRESHOLD &&
        b >= WHITE_THRESHOLD
      ) {
        continue;
      }

      found = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) return null;
  return { minX, minY, maxX, maxY };
}

/** Rogne marges blanches / transparentes avant upload. */
export async function trimLogoFile(file: File): Promise<File> {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0);
    const bounds = findContentBounds(
      context,
      canvas.width,
      canvas.height
    );
    if (!bounds) return file;

    const cropW = bounds.maxX - bounds.minX + 1;
    const cropH = bounds.maxY - bounds.minY + 1;
    const output = document.createElement("canvas");
    output.width = cropW + TRIM_MARGIN_PX * 2;
    output.height = cropH + TRIM_MARGIN_PX * 2;

    const outputCtx = output.getContext("2d");
    if (!outputCtx) return file;

    outputCtx.drawImage(
      canvas,
      bounds.minX,
      bounds.minY,
      cropW,
      cropH,
      TRIM_MARGIN_PX,
      TRIM_MARGIN_PX,
      cropW,
      cropH
    );

    const mime =
      file.type === "image/jpeg" || file.type === "image/jpg"
        ? "image/jpeg"
        : "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, mime, mime === "image/jpeg" ? 0.95 : undefined)
    );

    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "");
    const ext = mime === "image/jpeg" ? ".jpg" : ".png";
    return new File([blob], `${base}${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
