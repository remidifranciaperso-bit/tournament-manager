import { useCallback, useEffect, useMemo, useState } from "react";
import type { ValidatedMatchScore } from "./matchScoreRules";
import type { LiveTournamentMeta } from "./liveTypes";

export interface StoredMatchResult extends ValidatedMatchScore {
  code: string;
  validatedAt: number;
  launchedAt?: number;
}

interface ProgressState {
  completed: string[];
  results: Record<string, StoredMatchResult>;
  launches?: Record<string, number>;
}

function storageKey(liveToken: string): string {
  return `live-progress-${liveToken}`;
}

function startedAtKey(liveToken: string): string {
  return `live-started-at-${liveToken}`;
}

function finishedAtKey(liveToken: string): string {
  return `live-finished-at-${liveToken}`;
}

function loadState(liveToken: string): ProgressState {
  try {
    const raw = localStorage.getItem(storageKey(liveToken));
    if (!raw) return { completed: [], results: {}, launches: {} };

    const parsed = JSON.parse(raw) as ProgressState | string[];

    if (Array.isArray(parsed)) {
      return { completed: parsed, results: {}, launches: {} };
    }

    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      results: parsed.results ?? {},
      launches: parsed.launches ?? {},
    };
  } catch {
    return { completed: [], results: {}, launches: {} };
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

function loadFinishedAt(liveToken: string): number | null {
  try {
    const raw = localStorage.getItem(finishedAtKey(liveToken));
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveFinishedAt(liveToken: string, finishedAt: number): void {
  localStorage.setItem(finishedAtKey(liveToken), String(finishedAt));
}

function clearFinishedAt(liveToken: string): void {
  localStorage.removeItem(finishedAtKey(liveToken));
}

function resolveFinishedAt(
  liveToken: string,
  completedCount: number,
  totalMatches: number,
  startedAt: number | null,
  results: Record<string, StoredMatchResult>
): number | null {
  if (startedAt === null || totalMatches <= 0 || completedCount < totalMatches) {
    return null;
  }

  const stored = loadFinishedAt(liveToken);
  if (stored !== null) return stored;

  const validatedTimes = Object.values(results)
    .map((result) => result.validatedAt)
    .filter((value) => Number.isFinite(value));
  if (validatedTimes.length > 0) {
    return Math.max(...validatedTimes);
  }

  return Date.now();
}

export function formatMatchDurationMinutes(
  launchedAt: number | undefined,
  validatedAt: number | undefined
): string {
  if (!launchedAt || !validatedAt) return "—";
  const minutes = Math.max(0, Math.round((validatedAt - launchedAt) / 60_000));
  return `${minutes} min`;
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
  const [matchResults, setMatchResults] = useState<Record<string, StoredMatchResult>>(
    () => loadState(liveToken).results
  );
  const [matchLaunches, setMatchLaunches] = useState<Record<string, number>>(
    () => loadState(liveToken).launches ?? {}
  );
  const [startedAt, setStartedAt] = useState<number | null>(() =>
    loadStartedAt(liveToken)
  );
  const [finishedAt, setFinishedAt] = useState<number | null>(() => {
    const state = loadState(liveToken);
    return resolveFinishedAt(
      liveToken,
      state.completed.length,
      totalMatches,
      loadStartedAt(liveToken),
      state.results
    );
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const state = loadState(liveToken);
    setCompleted(new Set(state.completed));
    setMatchResults(state.results);
    setMatchLaunches(state.launches ?? {});
    const nextStartedAt = loadStartedAt(liveToken);
    setStartedAt(nextStartedAt);
    setFinishedAt(
      resolveFinishedAt(
        liveToken,
        state.completed.length,
        totalMatches,
        nextStartedAt,
        state.results
      )
    );
  }, [liveToken, totalMatches]);

  useEffect(() => {
    if (finishedAt !== null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [finishedAt]);

  useEffect(() => {
    if (startedAt === null || totalMatches <= 0) {
      if (finishedAt !== null) {
        setFinishedAt(null);
        clearFinishedAt(liveToken);
      }
      return;
    }

    if (completed.size >= totalMatches) {
      if (finishedAt !== null) return;

      const at = resolveFinishedAt(
        liveToken,
        completed.size,
        totalMatches,
        startedAt,
        matchResults
      );
      if (at !== null) {
        setFinishedAt(at);
        saveFinishedAt(liveToken, at);
      }
      return;
    }

    if (finishedAt !== null) {
      setFinishedAt(null);
      clearFinishedAt(liveToken);
    }
  }, [
    completed.size,
    finishedAt,
    liveToken,
    matchResults,
    startedAt,
    totalMatches,
  ]);

  const persistState = useCallback(
    (
      completedNext: Set<string>,
      resultsNext: Record<string, StoredMatchResult>,
      launchesNext: Record<string, number>
    ) => {
      saveState(liveToken, {
        completed: [...completedNext],
        results: resultsNext,
        launches: launchesNext,
      });
    },
    [liveToken]
  );

  const recordMatchLaunch = useCallback(
    (code: string, at?: number) => {
      const launchedAt = at ?? Date.now();
      setMatchLaunches((prev) => {
        if (prev[code]) return prev;
        const next = { ...prev, [code]: launchedAt };
        setCompleted((completedPrev) => {
          setMatchResults((resultsPrev) => {
            persistState(completedPrev, resultsPrev, next);
            return resultsPrev;
          });
          return completedPrev;
        });
        return next;
      });
    },
    [persistState]
  );

  const startTournament = useCallback(
    (initialMatchCodes: string[] = []) => {
      const at = Date.now();
      setStartedAt(at);
      saveStartedAt(liveToken, at);
      if (initialMatchCodes.length === 0) return;

      setMatchLaunches((prev) => {
        const next = { ...prev };
        for (const code of initialMatchCodes) {
          if (!next[code]) next[code] = at;
        }
        setCompleted((completedPrev) => {
          setMatchResults((resultsPrev) => {
            persistState(completedPrev, resultsPrev, next);
            return resultsPrev;
          });
          return completedPrev;
        });
        return next;
      });
    },
    [liveToken, persistState]
  );

  const toggleMatch = useCallback(
    (code: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setMatchResults((prevResults) => {
          persistState(next, prevResults, matchLaunches);
          return prevResults;
        });
        return next;
      });
    },
    [persistState, matchLaunches]
  );

  const completeMatch = useCallback(
    (code: string, score: ValidatedMatchScore) => {
      const validatedAt = Date.now();
      const stored: StoredMatchResult = {
        ...score,
        code,
        validatedAt,
        launchedAt: matchLaunches[code],
      };

      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(code);
        if (next.size >= totalMatches && totalMatches > 0) {
          setFinishedAt(validatedAt);
          saveFinishedAt(liveToken, validatedAt);
        }
        setMatchResults((prevResults) => {
          const nextResults = { ...prevResults, [code]: stored };
          persistState(next, nextResults, matchLaunches);
          return nextResults;
        });
        return next;
      });
    },
    [liveToken, matchLaunches, persistState, totalMatches]
  );

  const done = completed.size;
  const percent = totalMatches > 0 ? Math.round((done / totalMatches) * 100) : 0;

  const elapsed = useMemo(() => {
    if (startedAt === null) return "00:00";
    const end = finishedAt ?? now;
    return formatElapsed(end - startedAt);
  }, [startedAt, finishedAt, now]);

  return {
    completed,
    matchResults,
    matchLaunches,
    toggleMatch,
    completeMatch,
    recordMatchLaunch,
    done,
    total: totalMatches,
    percent,
    elapsed,
    started: startedAt !== null,
    finished: finishedAt !== null,
    startTournament,
  };
}
