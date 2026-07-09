import { captureElementImage } from "./captureElement";
import type { LivePageMap } from "./liveTypes";
import { pageEntries } from "./liveTabs";

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

async function waitForExportStage(timeoutMs = 12_000): Promise<HTMLElement> {
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
  await new Promise((resolve) => setTimeout(resolve, 350));
}

export async function captureManagerExportPages(
  pageMap: LivePageMap
): Promise<Record<string, string>> {
  const stage = await waitForExportStage();
  await waitForPaint();

  const captures: Record<string, string> = {};

  for (const section of ["main", "classement", "final"] as const) {
    for (const entry of pageEntries(pageMap, section)) {
      const key = captureKey(section, entry.index);
      const target = stage.querySelector(
        `[data-export-page="${key}"]`
      ) as HTMLElement | null;
      if (!target) {
        throw new Error(`Page Manager introuvable pour ${key}.`);
      }
      captures[key] = await captureElementImage(target, { scale: 2 });
    }
  }

  return captures;
}
