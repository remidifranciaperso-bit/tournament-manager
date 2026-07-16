/** Arrière-plan photo terrain de nuit (page d'entrée Live uniquement). */
export function LiveNightCourtBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      <img
        src="/images/live-court-night.png"
        alt=""
        decoding="async"
        draggable={false}
        className="h-full w-full object-cover object-center"
      />
      {/* Léger assombrissement pour la lisibilité du texte, sans masquer la photo. */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}
