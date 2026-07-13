import { useEffect, useState } from "react";
import type { LiveLayout } from "./liveTypes";
import { fetchTemplateLayout, getCachedTemplateLayout } from "./bracketSlideLayout";

export function useTemplateLayout(templateId: string) {
  const [layout, setLayout] = useState<LiveLayout | null>(() =>
    getCachedTemplateLayout(templateId)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLayout(null);
    setError(null);

    fetchTemplateLayout(templateId)
      .then((data) => {
        if (!cancelled) setLayout(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur layout");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return { layout, error, loading: !layout && !error };
}
