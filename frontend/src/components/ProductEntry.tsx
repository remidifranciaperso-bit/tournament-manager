import type { ReactNode } from "react";
import { LiveNightCourtBackground } from "../manager/LiveNightCourtBackground";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

/** Titre brush partagé Live / Engine : « Padel Tournament » + produit en dessous. */
export function ProductBrushHeadline({ product }: { product: string }) {
  return (
    <h1 className="flex flex-col items-center gap-0.5 sm:gap-1">
      <span
        className="font-brush text-[clamp(2.25rem,6.5vw,3.75rem)] leading-[1.05] text-lime"
        style={{ textShadow: BRUSH_GLOW }}
      >
        Padel Tournament
      </span>
      <span
        className="font-brush text-[clamp(3.5rem,11vw,6.5rem)] leading-[0.95] text-lime"
        style={{ textShadow: BRUSH_GLOW }}
      >
        {product}
      </span>
    </h1>
  );
}

/** Bandeau bas réservé au futur défilement des logos club (vide pour l'instant). */
export function ProductEntryLogoStrip() {
  return (
    <footer
      className="relative z-10 shrink-0 border-t border-white/[0.08] bg-black/45 backdrop-blur-md"
      style={{ minHeight: "clamp(4.25rem, 9vh, 5.75rem)" }}
      aria-hidden
    />
  );
}

/** Coque plein écran partagée Live / Engine (fond nuit + contenu + bandeau logos). */
export function ProductEntryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <LiveNightCourtBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
        <ProductEntryLogoStrip />
      </div>
    </div>
  );
}
