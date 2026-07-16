import type { ReactNode } from "react";
import { LiveNightCourtBackground } from "../manager/LiveNightCourtBackground";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

/** Titre brush partagé Live / Engine : aligné sur la hauteur Hub. */
export function ProductBrushHeadline({ product }: { product: string }) {
  return (
    <h1 className="flex shrink-0 flex-col items-center gap-0.5 font-brush leading-none text-lime sm:gap-1">
      <span
        className="text-[clamp(2.25rem,6.5vw,4rem)] leading-[1.05]"
        style={{ textShadow: BRUSH_GLOW }}
      >
        Padel Tournament
      </span>
      <span
        className="text-[clamp(3.25rem,10vw,5.75rem)] leading-[0.95]"
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
export function ProductEntryLayout({
  children,
  compact = false,
  alignTop = false,
}: {
  children: ReactNode;
  compact?: boolean;
  alignTop?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <LiveNightCourtBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main
          className={[
            "flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 sm:px-6",
            alignTop ? "justify-start" : "justify-center",
            compact ? "py-3 sm:py-4" : "py-8 sm:py-10",
          ].join(" ")}
        >
          {children}
        </main>
        <ProductEntryLogoStrip />
      </div>
    </div>
  );
}
