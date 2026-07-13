import { useCallback, useEffect, useState } from "react";
import { analyzeDisplayLayoutMode, type DisplayLayoutMode } from "./displayWindow";

export type DisplayConnectionStatus = "connected" | "connecting" | "available";

export interface DetectedDisplay {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isInternal: boolean;
  status: DisplayConnectionStatus;
}

interface ScreenDetailsLike {
  screens: Array<{
    label: string;
    left: number;
    top: number;
    width: number;
    height: number;
    isPrimary: boolean;
    isInternal: boolean;
  }>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function externalDisplaysOnly(
  screens: ScreenDetailsLike["screens"]
): DetectedDisplay[] {
  let externalIndex = 0;

  return screens
    .filter((screen) => !screen.isInternal && !screen.isPrimary)
    .map((screen) => {
      externalIndex += 1;
      const id = `screen-${screen.left}x${screen.top}-${screen.width}x${screen.height}`;

      return {
        id,
        label:
          screen.label?.trim() ||
          `Rétroprojecteur / écran externe ${externalIndex}`,
        left: screen.left,
        top: screen.top,
        width: screen.width,
        height: screen.height,
        isPrimary: false,
        isInternal: false,
        status: "connected" as const,
      };
    });
}

async function readDisplays(): Promise<{
  displays: DetectedDisplay[];
  layoutMode: DisplayLayoutMode;
  apiSupported: boolean;
}> {
  const getScreenDetails = (
    window as Window & {
      getScreenDetails?: () => Promise<ScreenDetailsLike>;
    }
  ).getScreenDetails;

  if (!getScreenDetails) {
    return { displays: [], layoutMode: "unknown", apiSupported: false };
  }

  try {
    const details = await getScreenDetails();
    return {
      displays: externalDisplaysOnly(details.screens),
      layoutMode: analyzeDisplayLayoutMode(details.screens),
      apiSupported: true,
    };
  } catch {
    return { displays: [], layoutMode: "unknown", apiSupported: true };
  }
}

export function useDisplayDetection(active: boolean) {
  const [displays, setDisplays] = useState<DetectedDisplay[]>([]);
  const [layoutMode, setLayoutMode] = useState<DisplayLayoutMode>("unknown");
  const [scanning, setScanning] = useState(false);
  const [apiSupported, setApiSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await readDisplays();
      setDisplays(result.displays);
      setLayoutMode(result.layoutMode);
      setApiSupported(result.apiSupported);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de détecter les écrans."
      );
      setDisplays([]);
      setLayoutMode("unknown");
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    void scan();

    const timer = window.setInterval(() => {
      void scan();
    }, 4000);

    const getScreenDetails = (
      window as Window & {
        getScreenDetails?: () => Promise<ScreenDetailsLike>;
      }
    ).getScreenDetails;

    let details: ScreenDetailsLike | null = null;
    let cancelled = false;

    const onScreensChange = () => {
      void scan();
    };

    void (async () => {
      if (!getScreenDetails) return;
      try {
        details = await getScreenDetails();
        if (cancelled) return;
        details.addEventListener?.("screenschange", onScreensChange);
      } catch {
        // Permission refusée.
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      details?.removeEventListener?.("screenschange", onScreensChange);
    };
  }, [active, scan]);

  const extendedMode = layoutMode === "extended";

  return {
    displays,
    layoutMode,
    extendedMode,
    scanning,
    apiSupported,
    error,
    scan,
  };
}
