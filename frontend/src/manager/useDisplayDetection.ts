import { useCallback, useEffect, useState } from "react";

export type DisplayConnectionStatus = "connected" | "connecting" | "available";

export interface DetectedDisplay {
  id: string;
  label: string;
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

function primaryDisplayFromWindow(): DetectedDisplay {
  const screen = window.screen;
  return {
    id: "screen-primary",
    label: "Écran principal",
    width: screen.width,
    height: screen.height,
    isPrimary: true,
    isInternal: true,
    status: "connected",
  };
}

function mapScreenDetails(screens: ScreenDetailsLike["screens"]): DetectedDisplay[] {
  return screens.map((screen, index) => {
    const id = `screen-${screen.left}x${screen.top}-${screen.width}x${screen.height}`;
    const isExternal = !screen.isInternal;

    return {
      id,
      label:
        screen.label?.trim() ||
        (screen.isPrimary
          ? "Écran principal"
          : isExternal
            ? `Rétroprojecteur / écran externe ${index}`
            : `Écran ${index + 1}`),
      width: screen.width,
      height: screen.height,
      isPrimary: screen.isPrimary,
      isInternal: screen.isInternal,
      status: "connected",
    };
  });
}

async function readDisplays(): Promise<{
  displays: DetectedDisplay[];
  apiSupported: boolean;
}> {
  const getScreenDetails = (
    window as Window & {
      getScreenDetails?: () => Promise<ScreenDetailsLike>;
    }
  ).getScreenDetails;

  if (!getScreenDetails) {
    return {
      displays: [primaryDisplayFromWindow()],
      apiSupported: false,
    };
  }

  try {
    const details = await getScreenDetails();
    const mapped = mapScreenDetails(details.screens);
    return {
      displays: mapped.length > 0 ? mapped : [primaryDisplayFromWindow()],
      apiSupported: true,
    };
  } catch {
    return {
      displays: [primaryDisplayFromWindow()],
      apiSupported: true,
    };
  }
}

export function useDisplayDetection(active: boolean) {
  const [displays, setDisplays] = useState<DetectedDisplay[]>([]);
  const [scanning, setScanning] = useState(false);
  const [apiSupported, setApiSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await readDisplays();
      setDisplays(result.displays);
      setApiSupported(result.apiSupported);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de détecter les écrans."
      );
      setDisplays([primaryDisplayFromWindow()]);
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

  return {
    displays,
    scanning,
    apiSupported,
    error,
    scan,
  };
}
