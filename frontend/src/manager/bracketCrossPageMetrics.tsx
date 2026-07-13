import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ViewportCrossPageStub } from "./bracketConnectors";

export interface BracketCrossPageMetrics {
  stub: ViewportCrossPageStub;
  slideWidth: number;
  slideHeight: number;
}

interface BracketCrossPageMetricsContextValue {
  metrics: BracketCrossPageMetrics | null;
  setMetrics: (metrics: BracketCrossPageMetrics | null) => void;
}

const BracketCrossPageMetricsContext =
  createContext<BracketCrossPageMetricsContextValue | null>(null);

export function BracketCrossPageMetricsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [metrics, setMetrics] = useState<BracketCrossPageMetrics | null>(null);
  const value = useMemo(() => ({ metrics, setMetrics }), [metrics]);

  return (
    <BracketCrossPageMetricsContext.Provider value={value}>
      {children}
    </BracketCrossPageMetricsContext.Provider>
  );
}

export function useBracketCrossPageMetrics() {
  const context = useContext(BracketCrossPageMetricsContext);
  if (!context) {
    throw new Error(
      "useBracketCrossPageMetrics must be used within BracketCrossPageMetricsProvider"
    );
  }
  return context;
}

export function useOptionalBracketCrossPageMetrics() {
  return useContext(BracketCrossPageMetricsContext);
}
