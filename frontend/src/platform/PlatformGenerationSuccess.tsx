import { motion } from "framer-motion";
import { WizardPageTitle } from "../components/Icons";
import { GhostButton, PrimaryButton } from "../components/ui";

export function PlatformGenerationSuccess({
  tournamentName,
  saving,
  saveError,
  onBackToTournaments,
  onRetrySave,
}: {
  tournamentName: string;
  saving: boolean;
  saveError: string | null;
  onBackToTournaments: () => void;
  onRetrySave?: () => void;
}) {
  const saved = !saving && !saveError;

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title={saved ? "Tournoi généré" : saveError ? "Enregistrement échoué" : "Tournoi généré"}
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
        className={[
          "mx-auto mt-8 max-w-md rounded-2xl border px-6 py-8",
          saveError
            ? "border-red-400/30 bg-red-500/10"
            : "border-lime/30 bg-lime/10",
        ].join(" ")}
      >
        <p className={["text-sm", saveError ? "text-red-100/90" : "text-lime/90"].join(" ")}>
          {saveError
            ? "Le PDF a été généré mais n'a pas pu être enregistré dans Mes tournois."
            : "PDF et données Live enregistrés — aucun JSON à télécharger."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {saveError && onRetrySave ? (
            <PrimaryButton onClick={onRetrySave} disabled={saving}>
              {saving ? "Enregistrement…" : "Réessayer l'enregistrement"}
            </PrimaryButton>
          ) : null}
          {!saveError ? (
            <PrimaryButton onClick={onBackToTournaments} disabled={saving}>
              Retour à Mes tournois
            </PrimaryButton>
          ) : (
            <GhostButton onClick={onBackToTournaments} disabled={saving}>
              Retour à Mes tournois
            </GhostButton>
          )}
        </div>
      </motion.div>
    </div>
  );
}
