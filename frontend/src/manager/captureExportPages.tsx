import { flushSync } from "react-dom";
import { captureElementImage } from "./captureElement";
import type { ExportCaptureTarget, ExportPoolView } from "./exportCapture";
import type { LivePageMap } from "./liveTypes";
import { pageEntries } from "./liveTabs";

/** Sections capturées pour l'export PDF (sous-ensemble des onglets). */
export type CaptureSection =
  | "main"
  | "classement"
  | "planning"
  | "final"
  | "pools";

export function captureKey(section: string, slideIndex: number): string {
  return `${section}:${slideIndex}`;
}

export function captureFieldName(key: string): string {
  return `capture_${key.replace(":", "_")}`;
}

export interface ScreenCaptureNavigation {
  showPage: (target: ExportCaptureTarget) => void;
  restore: () => void;
}

/** Clé de capture de la page « Composition » des poules (insérée après participants). */
export function compositionCaptureKey(slideIndex: number): string {
  return `composition:${slideIndex}`;
}

export interface PoolExportPlan {
  /** Index de slide Engine de la page « Composition » (POULE_*_EQ), ou null. */
  compositionSlideIndex: number | null;
  /** Slide de poule (« Partie N ») → lettre de poule (index de slide → « A », …). */
  poolSlideLetters: Map<number, string>;
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

function captureSelector(section: CaptureSection): string {
  if (section === "final") {
    return `${EXPORT_LAYER} [data-export-capture="final"]`;
  }
  if (section === "planning") {
    return `${EXPORT_LAYER} [data-export-capture="planning"]`;
  }
  if (section === "pools") {
    return `${EXPORT_LAYER} [data-export-capture="pools"]`;
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

async function captureTarget(
  navigation: ScreenCaptureNavigation,
  target: ExportCaptureTarget,
  selectorSection: CaptureSection
): Promise<{ image: string; element: HTMLElement } | null> {
  flushSync(() => {
    navigation.showPage(target);
  });
  await waitForPaint();
  const element = await waitForScreenTarget(captureSelector(selectorSection));
  try {
    const image = await captureElementImage(element, { highQuality: true });
    return { image, element };
  } catch (error) {
    // Capture vide (page sans contenu Manager) : on la saute, le backend garde
    // la page Engine d'origine.
    if (
      error instanceof Error &&
      error.message.includes("capture écran est vide")
    ) {
      return null;
    }
    throw error;
  }
}

export async function captureManagerExportPages(
  pageMap: LivePageMap,
  navigation: ScreenCaptureNavigation,
  /**
   * Plan d'export des poules : page « Composition » (insérée après participants)
   * et pages de poules (« Partie N ») rendues depuis l'onglet Poules du Manager.
   */
  poolExport?: PoolExportPlan
): Promise<ManagerExportCapture> {
  const captures: Record<string, string> = {};
  const crosspageStubs: Record<string, CrossPageStub> = {};
  const poolSlideLetters = poolExport?.poolSlideLetters ?? new Map<number, string>();

  try {
    // Page « Composition » des poules (rosters) : capturée depuis l'onglet
    // Poules et insérée par le backend juste après la page participants.
    if (poolExport?.compositionSlideIndex != null) {
      const captured = await captureTarget(
        navigation,
        { section: "pools", subPage: 0, poolView: "composition" },
        "pools"
      );
      if (captured) {
        captures[compositionCaptureKey(poolExport.compositionSlideIndex)] =
          captured.image;
      }
    }

    for (const section of ["main", "classement"] as const) {
      for (let page = 0; page < pageEntries(pageMap, section).length; page += 1) {
        const entry = pageEntries(pageMap, section)[page];
        const poolLetter =
          section === "main" ? poolSlideLetters.get(entry.index) : undefined;

        const poolView: ExportPoolView | undefined = poolLetter
          ? { letter: poolLetter }
          : undefined;
        const target: ExportCaptureTarget = poolView
          ? { section: "pools", subPage: page, poolView }
          : { section, subPage: page };

        const captured = await captureTarget(
          navigation,
          target,
          poolView ? "pools" : section
        );
        if (!captured) continue;

        // Les pages de poules sont enregistrées sous la clé « main » de leur
        // slide : le backend les composite comme n'importe quelle page principale.
        const key = captureKey(section, entry.index);
        captures[key] = captured.image;
        if (section === "main" && !poolView) {
          const stub = readCrossPageStub(captured.element);
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
