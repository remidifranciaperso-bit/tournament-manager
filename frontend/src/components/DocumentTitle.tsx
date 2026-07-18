import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/": "Padel Tournament Platform",
  "/engine": "Padel Tournament Engine",
  "/engine-v2": "Padel Tournament Engine V2",
  "/engine/participants": "Padel Tournament Engine",
  "/engine-v2/participants": "Padel Tournament Engine V2",
  "/manager": "Padel Tournament Manager",
};

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? "Padel Tournament Platform";
  }, [pathname]);

  return null;
}
