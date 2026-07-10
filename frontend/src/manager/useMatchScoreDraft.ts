import { useCallback, useMemo, useState } from "react";
import type { MatchFormatCode } from "./matchFormats";
import {
  activeSetCount,
  expectedSetCount,
  validateMatchScore,
  type SetScore,
  type ValidatedMatchScore,
} from "./matchScoreRules";

function emptySets(count: number): SetScore[] {
  return Array.from({ length: count }, () => ({ team1: 0, team2: 0 }));
}

export function useMatchScoreDraft(format: MatchFormatCode) {
  const baseSetCount = expectedSetCount(format);
  const [sets, setSets] = useState<SetScore[]>(() => emptySets(baseSetCount));
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const setCount = useMemo(
    () => activeSetCount(format, sets),
    [format, sets]
  );

  const validation = useMemo(() => {
    return validateMatchScore(format, sets.slice(0, setCount));
  }, [format, sets, setCount]);

  const reset = useCallback(() => {
    setSets(emptySets(baseSetCount));
    setActiveSetIndex(0);
    setError(null);
  }, [baseSetCount]);

  const updateGames = useCallback(
    (setIndex: number, side: "team1" | "team2", value: number) => {
      setSets((prev) => {
        const next = [...prev];
        next[setIndex] = { ...next[setIndex], [side]: value };
        return next;
      });
      setError(null);
    },
    []
  );

  const submit = useCallback((): ValidatedMatchScore | null => {
    const result = validateMatchScore(format, sets.slice(0, setCount));
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    setError(null);
    return result.result;
  }, [format, sets, setCount]);

  return {
    sets,
    activeSetIndex,
    setActiveSetIndex,
    setCount,
    updateGames,
    validation,
    error,
    submit,
    reset,
    isValid: validation.ok,
    validatedScore: validation.ok ? validation.result : null,
  };
}
