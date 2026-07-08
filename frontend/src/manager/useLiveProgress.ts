import { useCallback, useEffect, useMemo, useState } from "react";
import type { ValidatedMatchScore } from "./matchScoreRules";
import type { LiveTournamentMeta } from "./liveTypes";

export interface StoredMatchResult extends ValidatedMatchScore {
  code: string;
  validatedAt: number;
}

interface ProgressState {
  completed: string[];
  results: Record<string, StoredMatchResult>;
}

function storageKey(liveToken: string): string {
  return `live-progress-${liveToken}`;
}

function startedAtKey(liveToken: string): string {
  return `live-started-at-${liveToken}`;
}

function loadState(liveToken: string): ProgressState {
  try {
    const raw = localStorage.getItem(storageKey(liveToken));
    if (!raw) return { completed: [], results: {} };

    const parsed = JSON.parse(raw) as ProgressState | string[];

    if (Array.isArray(parsed)) {
      return { completed: parsed, results: {} };
    }

    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      results: parsed.results ?? {},
    };
  } catch {
    return { completed: [], results: {} };
  }
}

function saveState(liveToken: string, state: ProgressState): void {
  localStorage.setItem(storageKey(liveToken), JSON.stringify(state));
}

function loadStartedAt(liveToken: string): number | null {
  try {
    const raw = localStorage.getItem(startedAtKey(liveToken));
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveStartedAt(liveToken: string, startedAt: number): void {
  localStorage.setItem(startedAtKey(liveToken), String(startedAt));
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useLiveProgress(
  liveToken: string,
  totalMatches: number,
  _meta: LiveTournamentMeta
) {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const state = loadState(liveToken);
    return new Set(state.completed);
  });
  const [matchResults, setMatchResults] = useState<
    Record<string, StoredMatchResult>
  >(() => loadState(liveToken).results);
  const [startedAt, setStartedAt] = useState<number | null>(() =>
    loadStartedAt(liveToken)
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const state = loadState(liveToken);
    setCompleted(new Set(state.completed));
    setMatchResults(state.results);
    setStartedAt(loadStartedAt(liveToken));
  }, [liveToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const startTournament = useCallback(() => {
    const at = Date.now();
    setStartedAt(at);
    saveStartedAt(liveToken, at);
  }, [liveToken]);

  const toggleMatch = useCallback(
    (code: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setMatchResults((prevResults) => {
          saveState(liveToken, { completed: [...next], results: prevResults });
          return prevResults;
        });
        return next;
      });
    },
    [liveToken]
  );

  const completeMatch = useCallback(
    (code: string, score: ValidatedMatchScore) => {
      const stored: StoredMatchResult = {
        ...score,
        code,
        validatedAt: Date.now(),
      };

      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(code);
        setMatchResults((prevResults) => {
          const nextResults = { ...prevResults, [code]: stored };
          saveState(liveToken, { completed: [...next], results: nextResults });
          return nextResults;
        });
        return next;
      });
    },
    [liveToken]
  );

  const done = completed.size;
  const percent = totalMatches > 0 ? Math.round((done / totalMatches) * 100) : 0;

  const elapsed = useMemo(() => {
    if (startedAt === null) return "00:00";
    return formatElapsed(now - startedAt);
  }, [startedAt, now]);

  return {
    completed,
    matchResults,
    toggleMatch,
    completeMatch,
    done,
    total: totalMatches,
    percent,
    elapsed,
    started: startedAt !== null,
    startTournament,
  };
}
