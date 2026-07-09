import { captureElementImage } from "./captureElement";
import type { LivePageMap } from "./liveTypes";
import type { LivePrimaryTab } from "./liveTabs";
import { pageEntries } from "./liveTabs";

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

export interface ExportNavigation {
  goTo: (tab: LivePrimaryTab, subPage: number) => void;
}

async function waitForPaint(): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function waitForCaptureTarget(
  selector: string,
  timeoutMs = 8000
): Promise<HTMLElement> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element && element.offsetWidth > 40 && element.offsetHeight > 40) {
      return element;
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error(`Élément introuvable pour la capture : ${selector}`);
}

export async function captureVisibleManagerPages(
  pageMap: LivePageMap,
  navigation: ExportNavigation
): Promise<Record<string, string>> {
  const captures: Record<string, string> = {};

  const mainPages = pageEntries(pageMap, "main");
  for (let page = 0; page < mainPages.length; page += 1) {
    navigation.goTo("main", page);
    await waitForPaint();
    const target = await waitForCaptureTarget('[data-export-capture="bracket"]');
    captures[captureKey("main", mainPages[page].index)] =
      await captureElementImage(target);
  }

  const classementPages = pageEntries(pageMap, "classement");
  for (let page = 0; page < classementPages.length; page += 1) {
    navigation.goTo("classement", page);
    await waitForPaint();
    const target = await waitForCaptureTarget('[data-export-capture="bracket"]');
    captures[captureKey("classement", classementPages[page].index)] =
      await captureElementImage(target);
  }

  const finalPages = pageEntries(pageMap, "final");
  for (const entry of finalPages) {
    navigation.goTo("final", 0);
    await waitForPaint();
    const target = await waitForCaptureTarget('[data-export-capture="final"]');
    captures[captureKey("final", entry.index)] =
      await captureElementImage(target);
  }

  return captures;
}
