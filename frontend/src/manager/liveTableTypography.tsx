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

const LiveTableTypographyContext = createContext(false);
const LiveTableDisplayScaleContext = createContext(1);

export function isEngineV2LiveMeta(meta: LiveTournamentMeta): boolean {
  return Boolean(meta.template_id);
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
  children,
}: {
  meta: LiveTournamentMeta;
  children: ReactNode;
}) {
  const fromMeta = isEngineV2LiveMeta(meta);
  const fromBuild = import.meta.env.VITE_DEPLOY_TARGET === "engine-v2";
  const [fromDeploy, setFromDeploy] = useState(fromBuild);

  useEffect(() => {
    if (fromBuild) return;
    let cancelled = false;
    void fetchDeployTarget().then((target) => {
      if (!cancelled && isEngineV2Deploy(target)) setFromDeploy(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fromBuild]);

  const useEngineV2Headers = fromMeta || fromBuild || fromDeploy;

  const value = useMemo(() => useEngineV2Headers, [useEngineV2Headers]);

  return (
    <LiveTableTypographyContext.Provider value={value}>
      {children}
    </LiveTableTypographyContext.Provider>
  );
}

/** Compense le ``transform: scale()`` des onglets poules / planning / final. */
export function useLiveTableHeadPresentation(): {
  className: string;
  style?: CSSProperties;
} {
  const engineV2 = useContext(LiveTableTypographyContext);
  const displayScale = useContext(LiveTableDisplayScaleContext);
  if (!engineV2) {
    return { className: LIVE_TABLE_HEAD_CLASSIC };
  }

  const scale = Math.max(displayScale, 0.3);
  return {
    className: LIVE_TABLE_HEAD_ENGINE_V2,
    style: {
      fontSize: `${LIVE_TABLE_HEAD_PT / scale}pt`,
      fontWeight: 400,
    },
  };
}

/** @deprecated Préférer ``useLiveTableHeadPresentation``. */
export function useLiveTableHeadClass(): string {
  return useLiveTableHeadPresentation().className;
}
