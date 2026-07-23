import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchDeployTarget, isEngineV2Deploy } from "../api";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  LIVE_TABLE_HEAD_CLASSIC,
  LIVE_TABLE_HEAD_ENGINE_V2,
} from "./liveDataTable";

const LiveTableTypographyContext = createContext(false);

export function isEngineV2LiveMeta(meta: LiveTournamentMeta): boolean {
  return Boolean(meta.template_id);
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
  const [fromDeploy, setFromDeploy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchDeployTarget().then((target) => {
      if (!cancelled && isEngineV2Deploy(target)) setFromDeploy(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const useEngineV2Headers = fromMeta || fromBuild || fromDeploy;

  const value = useMemo(() => useEngineV2Headers, [useEngineV2Headers]);

  return (
    <LiveTableTypographyContext.Provider value={value}>
      {children}
    </LiveTableTypographyContext.Provider>
  );
}

export function useLiveTableHeadClass(): string {
  const engineV2 = useContext(LiveTableTypographyContext);
  return engineV2 ? LIVE_TABLE_HEAD_ENGINE_V2 : LIVE_TABLE_HEAD_CLASSIC;
}
