import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveTournamentMeta } from "./liveTypes";

function storageKey(liveToken: string): string {
  return `live-progress-${liveToken}`;
}

function loadCompleted(liveToken: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(liveToken));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(liveToken: string, codes: Set<string>): void {
  localStorage.setItem(storageKey(liveToken), JSON.stringify([...codes]));
}

function tournamentStartMs(dateTournoi: string, heureDebut: string): number {
  const [hours, minutes = "0"] = heureDebut.split(":");
  const start = new Date(dateTournoi);
  if (Number.isNaN(start.getTime())) return Date.now();
  start.setHours(Number(hours), Number(minutes), 0, 0);
  return start.getTime();
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
  meta: LiveTournamentMeta
) {
  const [completed, setCompleted] = useState<Set<string>>(() =>
    loadCompleted(liveToken)
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setCompleted(loadCompleted(liveToken));
  }, [liveToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleMatch = useCallback(
    (code: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        saveCompleted(liveToken, next);
        return next;
      });
    },
    [liveToken]
  );

  const done = completed.size;
  const percent = totalMatches > 0 ? Math.round((done / totalMatches) * 100) : 0;

  const elapsed = useMemo(() => {
    const start = tournamentStartMs(meta.date_tournoi, meta.heure_debut);
    return formatElapsed(now - start);
  }, [meta.date_tournoi, meta.heure_debut, now]);

  return {
    completed,
    toggleMatch,
    done,
    total: totalMatches,
    percent,
    elapsed,
  };
}
