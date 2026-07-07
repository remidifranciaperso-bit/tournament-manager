import { Link } from "react-router-dom";
import { CourtBackground } from "../components/CourtBackground";
import { GhostButton } from "../components/ui";

const MANAGER_BUILD = "manager-preview-1";

export default function ManagerPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-arena-950 text-white">
      <CourtBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-lime/70">
          Manager — preview
        </p>
        <h1 className="mt-4 font-display text-3xl tracking-wide sm:text-4xl">
          Saisie live en construction
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
          Cette zone accueillera la gestion du tournoi en direct : matchs en
          cours, saisie des scores et suivi des tableaux.
        </p>
        <p className="mt-8 text-[10px] uppercase tracking-widest text-white/25">
          build {MANAGER_BUILD}
        </p>
        <Link to="/" className="mt-10">
          <GhostButton>← Retour à l&apos;accueil</GhostButton>
        </Link>
      </div>
    </div>
  );
}
