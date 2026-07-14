import { flushSync } from "react-dom";
import { captureElementImage } from "./captureElement";
import type { LivePageMap } from "./liveTypes";
import type { LivePrimaryTab } from "./liveTabs";
import { pageEntries } from "./liveTabs";

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

export function captureFieldName(key: string): string {
  return `capture_${key.replace(":", "_")}`;
}

export interface ScreenCaptureNavigation {
  showPage: (tab: LivePrimaryTab, subPage: number) => void;
  restore: () => void;
}

async function waitForPaint(): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function waitForScreenTarget(
  selector: string,
  timeoutMs = 12_000
): Promise<HTMLElement> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (
      element &&
      element.offsetWidth >= 120 &&
      element.offsetHeight >= 120 &&
      element.getClientRects().length > 0
    ) {
      return element;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Capture écran impossible : ${selector}`);
}

const EXPORT_LAYER = "#export-capture-layer";

function captureSelector(
  section: "main" | "classement" | "planning" | "final"
): string {
  if (section === "final") {
    return `${EXPORT_LAYER} [data-export-capture="final"]`;
  }
  if (section === "planning") {
    return `${EXPORT_LAYER} [data-export-capture="planning"]`;
  }
  return `${EXPORT_LAYER} [data-export-capture="bracket"]`;
}

export interface CrossPageStub {
  midx: number;
  dir: "up" | "down";
}

export interface ManagerExportCapture {
  captures: Record<string, string>;
  crosspageStubs: Record<string, CrossPageStub>;
}

function readCrossPageStub(target: HTMLElement): CrossPageStub | null {
  const slide = target.querySelector<HTMLElement>("[data-bracket-slide]");
  if (!slide) return null;
  const midRaw = slide.getAttribute("data-crosspage-midx");
  const dir = slide.getAttribute("data-crosspage-dir");
  if (midRaw == null || (dir !== "up" && dir !== "down")) return null;
  const midx = Number.parseFloat(midRaw);
  if (!Number.isFinite(midx)) return null;
  return { midx, dir };
}

export async function captureManagerExportPages(
  pageMap: LivePageMap,
  navigation: ScreenCaptureNavigation
): Promise<ManagerExportCapture> {
  const captures: Record<string, string> = {};
  const crosspageStubs: Record<string, CrossPageStub> = {};

  try {
    for (const section of ["main", "classement", "planning", "final"] as const) {
      for (let page = 0; page < pageEntries(pageMap, section).length; page += 1) {
        const entry = pageEntries(pageMap, section)[page];
        flushSync(() => {
          navigation.showPage(section, page);
        });

        await waitForPaint();
        const target = await waitForScreenTarget(captureSelector(section));
        const key = captureKey(section, entry.index);
        captures[key] = await captureElementImage(target, { highQuality: true });
        if (section === "main") {
          const stub = readCrossPageStub(target);
          if (stub) crosspageStubs[key] = stub;
        }
      }
    }
  } finally {
    flushSync(() => {
      navigation.restore();
    });
  }

  return { captures, crosspageStubs };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
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
    const ext = dataUrl.startsWith("data:image/png") ? "png" : "jpg";
    form.append(captureFieldName(key), dataUrlToBlob(dataUrl), `${key}.${ext}`);
  }
  return form;
}
