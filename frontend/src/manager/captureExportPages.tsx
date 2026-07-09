import { captureElementImage } from "./captureElement";
import type { LivePageMap } from "./liveTypes";
import { pageEntries } from "./liveTabs";

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

export function captureFieldName(key: string): string {
  return `capture_${key.replace(":", "_")}`;
}

async function waitForExportStage(timeoutMs = 15_000): Promise<HTMLElement> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const stage = document.getElementById("manager-export-stage");
    const firstPage = stage?.querySelector("[data-export-page]") as
      | HTMLElement
      | null;
    if (firstPage && firstPage.offsetWidth > 40 && firstPage.offsetHeight > 40) {
      return stage as HTMLElement;
    }
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("Le bac de capture export n'est pas prêt.");
}

async function waitForPaint(): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
}

export async function captureManagerExportPages(
  pageMap: LivePageMap
): Promise<Record<string, string>> {
  const stage = await waitForExportStage();
  const pages = Array.from(
    stage.querySelectorAll("[data-export-page]")
  ) as HTMLElement[];

  const backdrop = document.createElement("div");
  backdrop.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;background:#ffffff;pointer-events:none;";
  document.body.appendChild(backdrop);

  const previousStageStyle = stage.style.cssText;
  stage.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:50%",
    "transform:translate(-50%,-50%)",
    "z-index:2147483647",
    "background:#ffffff",
    "opacity:1",
    "pointer-events:none",
    "overflow:visible",
  ].join(";");

  const captures: Record<string, string> = {};

  try {
    for (const section of ["main", "classement", "final"] as const) {
      for (const entry of pageEntries(pageMap, section)) {
        const key = captureKey(section, entry.index);
        const target = stage.querySelector(
          `[data-export-page="${key}"]`
        ) as HTMLElement | null;
        if (!target) {
          throw new Error(`Page Manager introuvable pour ${key}.`);
        }

        for (const page of pages) {
          page.style.display = page === target ? "block" : "none";
        }

        await waitForPaint();
        captures[key] = await captureElementImage(target, { scale: 2 });
      }
    }
  } finally {
    for (const page of pages) {
      page.style.display = "block";
    }
    stage.style.cssText = previousStageStyle;
    backdrop.remove();
  }

  return captures;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const bytes = atob(payload);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], { type: mime });
}

export function buildExportFormData(
  payload: Record<string, unknown>,
  captures: Record<string, string>
): FormData {
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  for (const [key, dataUrl] of Object.entries(captures)) {
    form.append(captureFieldName(key), dataUrlToBlob(dataUrl), `${key}.jpg`);
  }
  return form;
}
