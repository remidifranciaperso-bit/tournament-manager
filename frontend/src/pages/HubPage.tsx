import { Link } from "react-router-dom";
import { CourtBackground } from "../components/CourtBackground";
import { IconLogo, IconTrophy, IconGrid } from "../components/Icons";

const HUB_BUILD = "manager-preview-106";

export default function HubPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-arena-950 text-white">
      <CourtBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
        <IconLogo className="h-14 w-auto text-lime" />
        <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/40">
          Plateforme tournoi padel
        </p>
        <h1 className="mt-6 text-center font-display text-3xl tracking-wide text-white sm:text-4xl">
          Choisissez votre mode
        </h1>

        <div className="mt-12 grid w-full gap-5 sm:grid-cols-2">
          <Link
            to="/engine"
            className="group rounded-2xl border border-lime/25 bg-arena-900/70 p-8 transition hover:border-lime/60 hover:bg-arena-900"
          >
            <IconTrophy className="h-10 w-10 text-lime" />
            <h2 className="mt-5 font-display text-2xl tracking-wide text-lime">
              Engine
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Générer un tournoi depuis un Excel et exporter le dossier PDF.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-lime/80 group-hover:text-lime">
              Ouvrir →
            </span>
          </Link>

          <Link
            to="/manager"
            className="group rounded-2xl border border-white/10 bg-arena-900/70 p-8 transition hover:border-lime/40 hover:bg-arena-900"
          >
            <IconGrid className="h-10 w-10 text-lime" />
            <h2 className="mt-5 font-display text-2xl tracking-wide text-white">
              Manager
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Gérer un tournoi en live : scores, tableaux, planning et
              classements du jour J.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-lime/80 group-hover:text-lime">
              Ouvrir →
            </span>
          </Link>
        </div>

        <p className="mt-10 text-[10px] uppercase tracking-widest text-white/25">
          preview {HUB_BUILD}
        </p>
      </div>
    </div>
  );
}
