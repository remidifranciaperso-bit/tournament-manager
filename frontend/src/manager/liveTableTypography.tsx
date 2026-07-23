import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { fetchDeployTarget, isEngineV2Deploy } from "../api";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  LIVE_TABLE_HEAD_CLASSIC,
  LIVE_TABLE_HEAD_ENGINE_V2,
} from "./liveDataTable";

/** Aligné sur ``TABLE_HEAD_DISPLAY_PT`` (Engine / export PDF). */
export const LIVE_TABLE_HEAD_PT = 12;

const ENGINE_V2_PACK_VERSIONS = new Set(["engine-v2-live-capture-1"]);

const LiveTableTypographyContext = createContext(false);
const LiveTableDisplayScaleContext = createContext(1);

export function isEngineV2LivePack(packVersion?: string | null): boolean {
  return Boolean(packVersion && ENGINE_V2_PACK_VERSIONS.has(packVersion));
}

export function isEngineV2LiveMeta(meta: LiveTournamentMeta): boolean {
  return Boolean(meta.template_id);
}

export function isEngineV2LiveSession(
  meta: LiveTournamentMeta,
  packVersion?: string | null
): boolean {
  return isEngineV2LiveMeta(meta) || isEngineV2LivePack(packVersion);
}

/** Service Engine V2 ou session pack V2 — en-têtes 12 pt. */
export function resolveV2TableHeaders(
  meta: LiveTournamentMeta,
  packVersion?: string | null
): boolean {
  if (import.meta.env.VITE_DEPLOY_TARGET === "engine-v2") return true;
  return isEngineV2LiveSession(meta, packVersion);
}

export function LiveTableDisplayScaleProvider({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  const safe = scale > 0 ? scale : 1;
  return (
    <LiveTableDisplayScaleContext.Provider value={safe}>
      {children}
    </LiveTableDisplayScaleContext.Provider>
  );
}

export function LiveTableTypographyProvider({
  meta,
  packVersion = null,
  children,
}: {
  meta: LiveTournamentMeta;
  packVersion?: string | null;
  children: ReactNode;
}) {
  const fromSession = resolveV2TableHeaders(meta, packVersion);
  const [fromDeploy, setFromDeploy] = useState(
    () => import.meta.env.VITE_DEPLOY_TARGET === "engine-v2"
  );

  useEffect(() => {
    if (import.meta.env.VITE_DEPLOY_TARGET === "engine-v2") return;
    let cancelled = false;
    void fetchDeployTarget().then((target) => {
      if (!cancelled && isEngineV2Deploy(target)) setFromDeploy(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => fromSession || fromDeploy,
    [fromSession, fromDeploy]
  );

  return (
    <LiveTableTypographyContext.Provider value={value}>
      {children}
    </LiveTableTypographyContext.Provider>
  );
}

function useEngineV2Flag(explicitV2?: boolean): boolean {
  const fromContext = useContext(LiveTableTypographyContext);
  if (explicitV2 === true) return true;
  if (explicitV2 === false) return false;
  if (import.meta.env.VITE_DEPLOY_TARGET === "engine-v2") return true;
  return fromContext;
}

/** @deprecated Préférer prop ``v2TableHeaders`` + ``resolveV2TableHeaders``. */
export function useLiveTableV2Typography(explicitV2?: boolean): boolean {
  return useEngineV2Flag(explicitV2);
}

export function useLiveTableShellClass(
  baseClass: string,
  explicitV2?: boolean
): string {
  const v2 = useEngineV2Flag(explicitV2);
  return v2 ? `${baseClass} live-table-v2` : baseClass;
}

export function liveTableHeadPresentation(
  engineV2: boolean,
  displayScale: number
): { className: string; style?: CSSProperties } {
  if (!engineV2) {
    return { className: LIVE_TABLE_HEAD_CLASSIC };
  }
  const scale = Math.max(displayScale, 0.3);
  return {
    className: LIVE_TABLE_HEAD_ENGINE_V2,
    style: {
      fontSize: `${16 / scale}px`,
      fontWeight: 400,
    },
  };
}

export function useLiveTableHeadPresentation(explicitV2?: boolean): {
  className: string;
  style?: CSSProperties;
} {
  const engineV2 = useEngineV2Flag(explicitV2);
  const displayScale = useContext(LiveTableDisplayScaleContext);
  return liveTableHeadPresentation(engineV2, displayScale);
}

export function useLiveTableHeadClass(explicitV2?: boolean): string {
  return useLiveTableHeadPresentation(explicitV2).className;
}
