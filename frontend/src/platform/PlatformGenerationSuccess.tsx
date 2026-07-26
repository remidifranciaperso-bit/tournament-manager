import { motion } from "framer-motion";
import { WizardPageTitle } from "../components/Icons";
import { PrimaryButton } from "../components/ui";

export function PlatformGenerationSuccess({
  tournamentName,
  saving,
  saveError,
  onBackToTournaments,
}: {
  tournamentName: string;
  saving: boolean;
  saveError: string | null;
  onBackToTournaments: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Tournoi généré"
        subtitle={
          saving
            ? "Enregistrement dans votre espace…"
            : saveError
              ? saveError
              : `${tournamentName} est prêt dans Mes tournois.`
        }
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-8 max-w-md rounded-2xl border border-lime/30 bg-lime/10 px-6 py-8"
      >
        <p className="text-sm text-lime/90">
          PDF et données Live enregistrés — aucun JSON à télécharger.
        </p>
        <div className="mt-6">
          <PrimaryButton onClick={onBackToTournaments} disabled={saving}>
            Retour à Mes tournois
          </PrimaryButton>
        </div>
      </motion.div>
    </div>
  );
}
