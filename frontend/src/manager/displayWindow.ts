import type { DetectedDisplay } from "./useDisplayDetection";

export type DisplayLayoutMode = "extended" | "mirror_or_single" | "unknown";

interface RawScreen {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isInternal: boolean;
}

export function analyzeDisplayLayoutMode(
  screens: RawScreen[]
): DisplayLayoutMode {
  if (screens.length === 0) return "unknown";

  const externals = screens.filter(
    (screen) => !screen.isInternal && !screen.isPrimary
  );
  if (externals.length > 0) return "extended";

  if (screens.length > 1) {
    const positions = new Set(
      screens.map((screen) => `${screen.left},${screen.top}`)
    );
    if (positions.size > 1) return "extended";
  }

  return "mirror_or_single";
}

export interface DisplayScreenBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function displayBounds(display: DetectedDisplay): DisplayScreenBounds {
  return {
    left: display.left,
    top: display.top,
    width: display.width,
    height: display.height,
  };
}

/** Ouvre l'URL sur l'écran externe ciblé — sans dialogue de choix d'écran. */
export function openBroadcastWindow(
  url: string,
  display: DetectedDisplay
): Window | null {
  const { left, top, width, height } = displayBounds(display);
  const features = [
    "popup=yes",
    `left=${left}`,
    `top=${top}`,
    `width=${width}`,
    `height=${height}`,
  ].join(",");

  const handle = window.open(url, `broadcast-${display.id}`, features);
  if (!handle) return null;

  try {
    handle.moveTo(left, top);
    handle.resizeTo(width, height);
    handle.focus();
  } catch {
    // Certains navigateurs restreignent moveTo/resizeTo.
  }

  return handle;
}

export const EXTENDED_MODE_HINT_MAC =
  "Pomme  → Réglages Système → Moniteurs → fenêtres séparées (pas « Miroir »).";

export const EXTENDED_MODE_HINT_WIN =
  "Windows + P → « Étendre » (pas « Dupliquer »).";

export function extendedModeHint(): string {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return EXTENDED_MODE_HINT_MAC;
  if (platform.includes("win")) return EXTENDED_MODE_HINT_WIN;
  return "Paramètres d'affichage → mode Étendu (pas Dupliquer / Miroir).";
}
