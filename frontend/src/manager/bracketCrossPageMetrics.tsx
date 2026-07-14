import {
  createContext,
  useCallback,
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

function metricsEqual(
  a: BracketCrossPageMetrics | null,
  b: BracketCrossPageMetrics | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.slideWidth === b.slideWidth &&
    a.slideHeight === b.slideHeight &&
    a.stub.midXSlidePct === b.stub.midXSlidePct &&
    a.stub.direction === b.stub.direction
  );
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
  const [metrics, setMetricsState] = useState<BracketCrossPageMetrics | null>(
    null
  );

  const setMetrics = useCallback((next: BracketCrossPageMetrics | null) => {
    setMetricsState((prev) => (metricsEqual(prev, next) ? prev : next));
  }, []);

  const value = useMemo(
    () => ({ metrics, setMetrics }),
    [metrics, setMetrics]
  );

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
