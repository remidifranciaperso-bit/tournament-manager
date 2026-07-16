import { createPortal } from "react-dom";

/** Arrière-plan photo terrain de nuit (Hub + entrées Engine/Live). */
export function LiveNightCourtBackground() {
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <img
        src="/images/padel-court-night-v6.png"
        alt=""
        decoding="async"
        draggable={false}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-cover object-center"
        style={{
          width: "110vw",
          height: "110vh",
          maxWidth: "none",
          marginLeft: "-0.5vw",
        }}
      />
      {/* Fondu noir sur les bandes vides + léger vignettage aux bords. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(to right, rgb(0 0 0) 0%, transparent 14%, transparent 86%, rgb(0 0 0) 100%)",
            "linear-gradient(to bottom, rgb(0 0 0) 0%, transparent 10%, transparent 90%, rgb(0 0 0) 100%)",
            "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.55) 100%)",
          ].join(", "),
        }}
      />
      <div className="absolute inset-0 bg-black/15" />
    </div>,
    document.body
  );
}
