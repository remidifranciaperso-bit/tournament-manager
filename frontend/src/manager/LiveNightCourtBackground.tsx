/** Arrière-plan photo terrain de nuit (Hub + entrées Engine/Live). */
export function LiveNightCourtBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      <img
        src="/images/padel-court-night-v6.png"
        alt=""
        decoding="async"
        draggable={false}
        className="absolute left-[48.75%] top-1/2 -translate-x-1/2 -translate-y-1/2 object-center"
        style={{ width: "110%", height: "110%", objectFit: "cover" }}
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
    </div>
  );
}
