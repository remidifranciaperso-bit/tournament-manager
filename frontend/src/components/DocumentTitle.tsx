import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/": "Padel Tournament Platform",
  "/engine": "Padel Tournament Engine",
  "/engine/participants": "Padel Tournament Engine",
  "/manager": "Padel Tournament Manager",
};

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? "Padel Tournament Platform";
  }, [pathname]);

  return null;
}
