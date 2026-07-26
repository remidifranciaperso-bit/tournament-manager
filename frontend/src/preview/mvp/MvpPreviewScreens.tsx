import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileDrop } from "../../components/FileDrop";
import { IconCheck, IconClock, IconGrid, IconLogo, IconTable, IconTrophy, WizardPageTitle } from "../../components/Icons";
import { ProductBrushHeadline } from "../../components/ProductEntry";
import { GhostButton, NumberStepper, PrimaryButton } from "../../components/ui";
import { LIVE_LOGO_HEIGHT_CLASS } from "../../manager/LiveTabTitle";
import { defaultForm, type TournamentForm } from "../../types";
import { trimLogoFile } from "../../utils/trimLogoImage";
import { syncTerrains } from "../../wizard/helpers";
import { MVP_PREVIEW_BUILD, MvpLoginButton, MvpPreviewShell } from "./MvpPreviewShell";
import {
  platformApplyTeamChange,
  platformCheckTeamChange,
  platformFetchTestAccounts,
  platformFetchTournamentRoster,
  type PlatformTestAccount,
  type TeamChangePayload,
} from "../../platform/api";
import {
  STATUS_LABELS,
  mockRosterForTournament,
  resolveTerrainPrincipal,
  type MvpClubProfile,
  type MvpTournamentSummary,
} from "./mockMvpData";

export type MvpPreviewScreen =
  | "login"
  | "tournaments"
  | "club"
  | "tournament"
  | "teams";

function actionCardClass(primary = false) {
  return primary
    ? "inline-flex w-full flex-col items-start gap-2 rounded-2xl border border-lime/40 bg-lime/10 px-5 py-4 text-left transition hover:bg-lime/15"
    : "inline-flex w-full flex-col items-start gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 text-left transition hover:border-lime/25 hover:bg-white/[0.06]";
}

function StatusBadge({ status }: { status: MvpTournamentSummary["status"] }) {
  const live = status === "live_active";
  const sent = status === "convocations_sent";
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
        live
          ? "bg-lime/15 text-lime ring-lime/35"
          : sent
            ? "bg-template-blue/15 text-sky-200 ring-template-blue/30"
            : "bg-white/[0.06] text-white/55 ring-white/10",
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function PreviewAccountNav({
  active,
  onNavigate,
}: {
  active: MvpPreviewScreen;
  onNavigate: (screen: MvpPreviewScreen) => void;
}) {
  const items: { id: MvpPreviewScreen; label: string }[] = [
    { id: "tournaments", label: "Mes tournois" },
    { id: "club", label: "Paramètres club" },
  ];

  return (
    <nav className="flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          className={[
            "rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition",
            active === item.id
              ? "bg-lime/15 text-lime ring-1 ring-lime/35"
              : "bg-white/[0.04] text-white/45 hover:text-white/70",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function MvpAccountTopBar({
  onBack,
  onLogout,
  showBack = true,
}: {
  onBack: () => void;
  onLogout: () => void;
  showBack?: boolean;
}) {
  return (
    <div className="flex w-full max-w-4xl items-center justify-between gap-3 pb-1">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-white/45 transition hover:text-lime"
        >
          Retour
        </button>
      ) : (
        <span aria-hidden className="w-12" />
      )}
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/55 transition hover:border-white/25 hover:text-white"
      >
        Se déconnecter
      </button>
    </div>
  );
}

function MvpClubSummaryCard({
  profile,
  onEdit,
}: {
  profile: MvpClubProfile;
  onEdit: () => void;
}) {
  const terrainPrincipal = resolveTerrainPrincipal(
    profile.terrains,
    profile.terrainPrincipal
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">
      <h3 className="font-display text-lg text-white">Mes paramètres de club</h3>
      <div className="mt-4 flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1.5">
          {profile.hasLogo && profile.logoPreviewUrl ? (
            <img
              src={profile.logoPreviewUrl}
              alt=""
              className="max-h-full max-w-full object-contain object-center"
            />
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
              Logo
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-white">{profile.club}</p>
          <p className="mt-2 text-sm text-white/55">
            {profile.nbTerrains} terrain{profile.nbTerrains > 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            {profile.terrains.join(" · ")}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/35">
            Principal : {terrainPrincipal}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <GhostButton onClick={onEdit}>Modifier</GhostButton>
      </div>
    </section>
  );
}

export function MvpLoginScreen({
  onLogin,
  useTestAccounts = false,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  useTestAccounts?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testAccounts, setTestAccounts] = useState<PlatformTestAccount[]>([]);

  useEffect(() => {
    if (!useTestAccounts) return;
    void platformFetchTestAccounts().then(setTestAccounts);
  }, [useTestAccounts]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MvpPreviewShell center>
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <ProductBrushHeadline product="Manager" />
        <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
          <p className="text-center font-display text-lg tracking-wide text-white">Connexion</p>
          {useTestAccounts && testAccounts.length > 0 ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Comptes test · un espace par utilisateur
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {testAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setError(null);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/65 transition hover:border-lime/25 hover:bg-lime/[0.04] hover:text-white disabled:opacity-50"
                  >
                    <span className="font-semibold text-white/85">{account.email}</span>
                    <span className="text-white/40"> · mot de passe </span>
                    <span className="font-mono text-lime/80">{account.password}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            <div>
              <label className="field-label" htmlFor="mvp-email">
                Email
              </label>
              <input
                id="mvp-email"
                type="email"
                className="text-input lime-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="mvp-password">
                Mot de passe
              </label>
              <input
                id="mvp-password"
                type="password"
                className="text-input lime-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-center text-sm text-red-300/90">{error}</p>
          ) : null}
          <div className="mt-5">
            <MvpLoginButton onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </MvpLoginButton>
          </div>
        </div>
        {!useTestAccounts ? (
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-lime/70">
            Preview MVP · {MVP_PREVIEW_BUILD}
          </p>
        ) : null}
      </div>
    </MvpPreviewShell>
  );
}

export function MvpTournamentsScreen({
  profile,
  tournaments,
  userEmail,
  onOpenTournament,
  onNewTournament,
  onEditClub,
  onBack,
  onLogout,
}: {
  profile: MvpClubProfile;
  tournaments: MvpTournamentSummary[];
  userEmail?: string;
  onOpenTournament: (id: string) => void;
  onNewTournament: () => void;
  onEditClub: () => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <MvpPreviewShell scrollable>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-8 pt-2">
        <MvpAccountTopBar onBack={onBack} onLogout={onLogout} showBack={false} />

        {userEmail ? (
          <p className="-mt-2 text-center text-xs text-white/40">{userEmail}</p>
        ) : null}

        <MvpClubSummaryCard profile={profile} onEdit={onEditClub} />

        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <h2 className="font-display text-2xl text-white">Mes tournois</h2>
          <PrimaryButton onClick={onNewTournament}>Nouveau tournoi</PrimaryButton>
        </div>

        {tournaments.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/45">
            Aucun tournoi enregistré. Créez votre premier tournoi via Engine V2.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((tournament) => (
              <button
                key={tournament.id}
                type="button"
                onClick={() => onOpenTournament(tournament.id)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-lime/25 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-white">{tournament.name}</p>
                    <p className="mt-1 text-sm text-white/50">{tournament.dateLabel}</p>
                  </div>
                  <StatusBadge status={tournament.status} />
                </div>
                <p className="mt-4 text-sm text-white/65">{tournament.formatLabel}</p>
                <p className="mt-1 text-xs text-white/40">Ouvrir la fiche tournoi</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </MvpPreviewShell>
  );
}

export function MvpClubSettingsScreen({
  profile,
  onSave,
  onBack,
  onLogout,
}: {
  profile: MvpClubProfile;
  onSave: (profile: MvpClubProfile, logoFile?: File | null) => void | Promise<void>;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [form, setForm] = useState<TournamentForm>(() => ({
    ...defaultForm,
    club: profile.club,
    nbTerrains: profile.nbTerrains,
    terrains: [...profile.terrains],
    terrainPrincipal: profile.terrainPrincipal,
    pasDeLogo: false,
  }));
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    profile.logoPreviewUrl ?? null
  );
  const [logoTrimming, setLogoTrimming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const patch = (partial: Partial<TournamentForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = async () => {
    const hasNewLogo = Boolean(form.logoFile);
    const terrains = form.terrains.map((terrain) => terrain.toUpperCase());
    const terrainPrincipal = resolveTerrainPrincipal(terrains, form.terrainPrincipal);
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(
        {
          club: form.club,
          nbTerrains: form.nbTerrains,
          terrains,
          terrainPrincipal,
          hasLogo: hasNewLogo || profile.hasLogo,
          logoPreviewUrl: hasNewLogo ? logoPreviewUrl : profile.logoPreviewUrl ?? null,
        },
        form.logoFile
      );
      onBack();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (form.logoFile) return;
    setLogoPreviewUrl(profile.logoPreviewUrl ?? null);
  }, [profile.logoPreviewUrl, form.logoFile]);

  useEffect(() => {
    if (!form.logoFile || form.pasDeLogo) {
      return;
    }
    const url = URL.createObjectURL(form.logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.logoFile, form.pasDeLogo]);

  return (
    <MvpPreviewShell center={false}>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden pt-1">
        <MvpAccountTopBar onBack={onBack} onLogout={onLogout} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
          <div className="mb-3 shrink-0 text-center">
            <h2
              className="font-brush text-[clamp(1.75rem,5vw,2.35rem)] leading-[1.05] text-lime"
              style={{ textShadow: "0 0 40px rgba(212,255,74,0.12)" }}
            >
              Paramètres club
            </h2>
            <p className="mt-1 whitespace-nowrap text-xs text-white/45">
              Logo et terrains — pré-remplis à chaque nouveau tournoi.
            </p>
          </div>

          <div className="space-y-2.5 text-left">
            <div>
              <label className="field-label text-[11px]" htmlFor="mvp-club">
                Club organisateur
              </label>
              <input
                id="mvp-club"
                className="text-input lime-input py-2 uppercase"
                value={form.club}
                onChange={(e) => patch({ club: e.target.value.toUpperCase() })}
              />
            </div>

            {!form.pasDeLogo ? (
              <div className="mx-auto max-w-md">
                <label className="field-label text-[11px]">Logo du club</label>
                {(form.logoFile && logoPreviewUrl) || (profile.hasLogo && logoPreviewUrl && !form.logoFile) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lime-panel flex flex-col items-center gap-4 p-8 text-center"
                  >
                    <div className="flex h-28 w-full items-center justify-center rounded-xl bg-white/[0.04] p-4">
                      <img
                        src={logoPreviewUrl}
                        alt="Aperçu du logo"
                        className={`${LIVE_LOGO_HEIGHT_CLASS} w-auto max-w-full object-contain object-center`}
                      />
                    </div>
                    {form.logoFile ? (
                      <p className="text-sm text-white/50">{form.logoFile.name}</p>
                    ) : null}
                    <GhostButton
                      onClick={() => {
                        patch({ logoFile: null });
                        setLogoPreviewUrl(null);
                      }}
                    >
                      Changer de logo
                    </GhostButton>
                  </motion.div>
                ) : (
                  <FileDrop
                    accept=".png,.jpg,.jpeg"
                    file={null}
                    onFile={async (file) => {
                      if (!file) return;
                      setLogoTrimming(true);
                      try {
                        const trimmed = await trimLogoFile(file);
                        patch({ logoFile: trimmed, pasDeLogo: false });
                      } finally {
                        setLogoTrimming(false);
                      }
                    }}
                    title={logoTrimming ? "Préparation du logo…" : "Glissez votre logo ici"}
                    hint="PNG ou JPG"
                    icon={<IconLogo className="h-7 w-7" />}
                    variant="lime"
                    disabled={logoTrimming}
                  />
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-3">
              <label className="field-label-tight shrink-0 text-[11px]">Nombre de terrains</label>
              <NumberStepper
                value={form.nbTerrains}
                min={1}
                max={8}
                onChange={(nb) => {
                  setForm((prev) => syncTerrains(prev, nb));
                }}
              />
            </div>

            <div>
              <label className="field-label-tight text-[11px]">Noms des terrains</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {form.terrains.map((nom, index) => (
                  <input
                    key={index}
                    className="text-input lime-input py-2 text-sm uppercase"
                    value={nom}
                    placeholder={`Terrain ${index + 1}`}
                    onChange={(e) => {
                      const terrains = [...form.terrains];
                      const previous = terrains[index];
                      const nextName = e.target.value.toUpperCase();
                      terrains[index] = nextName;
                      const update: Partial<TournamentForm> = { terrains };
                      if (
                        form.terrainPrincipal.toUpperCase() === previous.toUpperCase()
                      ) {
                        update.terrainPrincipal = nextName;
                      }
                      patch(update);
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="field-label-tight text-[11px]" htmlFor="mvp-terrain-principal">
                Terrain principal — finale
              </label>
              <select
                id="mvp-terrain-principal"
                className="text-input lime-input py-2 text-sm"
                value={resolveTerrainPrincipal(form.terrains, form.terrainPrincipal)}
                onChange={(e) =>
                  patch({ terrainPrincipal: e.target.value.toUpperCase() })
                }
              >
                {form.terrains.map((terrain) => (
                  <option key={terrain} value={terrain}>
                    {terrain}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex shrink-0 flex-col items-center gap-2 pb-2">
            {saveError ? (
              <p className="text-center text-sm text-red-300/90">{saveError}</p>
            ) : null}
            <PrimaryButton onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer le profil club"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </MvpPreviewShell>
  );
}

export function MvpTournamentDashboardScreen({
  tournament,
  onViewPdf,
  onDownloadPdf,
  onExportConvocations,
  onModifyTeams,
  onLaunchLive,
  onDelete,
  onBack,
  onLogout,
}: {
  tournament: MvpTournamentSummary;
  onViewPdf: () => void;
  onDownloadPdf: () => void;
  onExportConvocations: () => void;
  onModifyTeams: () => void;
  onLaunchLive: () => void;
  onDelete?: () => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <MvpPreviewShell scrollable>
      <div className="mx-auto w-full max-w-3xl pb-8 pt-2">
        <MvpAccountTopBar onBack={onBack} onLogout={onLogout} />

        <div className="pt-3 text-center">
          <StatusBadge status={tournament.status} />
          <h2 className="mt-3 font-display text-[clamp(1.5rem,4vw,2.25rem)] text-white">
            {tournament.name}
          </h2>
          <p className="mt-2 text-sm text-white/55">
            {tournament.club} · {tournament.dateLabel} · {tournament.formatLabel}
          </p>
          {tournament.status === "convocations_sent" ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-sky-200/80">
              Convocations verrouillées — modifications sans décalage horaire
            </p>
          ) : null}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 grid gap-3 sm:grid-cols-2"
        >
          <button type="button" onClick={onViewPdf} className={actionCardClass()}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconTable className="h-5 w-5 text-lime" />
              Visualiser le PDF
            </span>
            <span className="text-xs text-white/50">
              Ouvrir le dossier complet dans un nouvel onglet
            </span>
          </button>

          <button type="button" onClick={onDownloadPdf} className={actionCardClass()}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconCheck className="h-5 w-5 text-lime" />
              Télécharger le PDF
            </span>
            <span className="text-xs text-white/50">
              Tableaux, planning, convocations, classement final
            </span>
          </button>

          <button type="button" onClick={onExportConvocations} className={actionCardClass()}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconClock className="h-5 w-5 text-lime" />
              Exporter les convocations
            </span>
            <span className="text-xs text-white/50">
              Télécharger la page convocations — à envoyer aux joueurs
            </span>
          </button>

          <button type="button" onClick={onModifyTeams} className={actionCardClass()}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconGrid className="h-5 w-5 text-lime" />
              Modifier les équipes
            </span>
            <span className="text-xs text-white/50">
              Partenaire, remplacement — vérif convocations
            </span>
          </button>
        </motion.div>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onLaunchLive}
            className={`${actionCardClass()} w-full max-w-sm text-left`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <IconTrophy className="h-5 w-5 text-lime" />
              Lancer le Live V2
            </span>
            <span className="text-xs text-white/50">
              Suivi jour J — snapshot intégré, sans JSON
            </span>
          </button>
        </div>

        {onDelete ? (
          <div className="mt-8 flex justify-center border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-semibold uppercase tracking-wide text-red-300/80 transition hover:text-red-200"
            >
              Supprimer ce tournoi
            </button>
          </div>
        ) : null}
      </div>
    </MvpPreviewShell>
  );
}

type TeamChangeMode = "partner" | "replace" | null;
type CompatibilityResult = "ok" | "adjust" | "blocked" | null;

interface PlayerFields {
  nom: string;
  prenom: string;
  classement: string;
}

const EMPTY_PLAYER: PlayerFields = { nom: "", prenom: "", classement: "" };

function PlayerReplacementFields({
  title,
  values,
  onChange,
}: {
  title: string;
  values: PlayerFields;
  onChange: (next: PlayerFields) => void;
}) {
  return (
    <div className="mt-4">
      <p className="field-label-tight">{title}</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="field-label-tight">Nom</label>
          <input
            className="text-input lime-input mt-2 uppercase"
            placeholder="NOM"
            value={values.nom}
            onChange={(event) => onChange({ ...values, nom: event.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="field-label-tight">Prénom</label>
          <input
            className="text-input lime-input mt-2"
            placeholder="Prénom"
            value={values.prenom}
            onChange={(event) => onChange({ ...values, prenom: event.target.value })}
          />
        </div>
        <div>
          <label className="field-label-tight">Classement</label>
          <input
            className="text-input lime-input mt-2"
            placeholder="P100"
            value={values.classement}
            onChange={(event) => onChange({ ...values, classement: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function MvpTeamChangeScreen({
  tournament,
  apiEnabled = false,
  onApplied,
  onBack,
  onLogout,
}: {
  tournament: MvpTournamentSummary;
  apiEnabled?: boolean;
  onApplied?: () => void | Promise<void>;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<TeamChangeMode>(null);
  const [result, setResult] = useState<CompatibilityResult>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [replacementPlayer, setReplacementPlayer] = useState<PlayerFields>(EMPTY_PLAYER);
  const [replacementTeam, setReplacementTeam] = useState<{
    joueur1: PlayerFields;
    joueur2: PlayerFields;
  }>({ joueur1: EMPTY_PLAYER, joueur2: EMPTY_PLAYER });
  const [roster, setRoster] = useState(() => mockRosterForTournament(tournament));

  useEffect(() => {
    if (!apiEnabled) {
      setRoster(mockRosterForTournament(tournament));
      return;
    }
    void platformFetchTournamentRoster(tournament.id)
      .then(setRoster)
      .catch(() => setRoster(mockRosterForTournament(tournament)));
  }, [apiEnabled, tournament]);

  const options = useMemo(
    () =>
      [
        {
          id: "partner" as const,
          title: "Remplacer un partenaire",
          hint: "Garder le slot équipe, changer un joueur",
        },
        {
          id: "replace" as const,
          title: "Remplacer une équipe",
          hint: "Nouvelle paire complète sur le même TS",
        },
      ] as const,
    []
  );

  const resetForm = () => {
    setSelectedPlayerId("");
    setSelectedTeamId("");
    setReplacementPlayer(EMPTY_PLAYER);
    setReplacementTeam({ joueur1: EMPTY_PLAYER, joueur2: EMPTY_PLAYER });
    setResult(null);
    setCheckMessage(null);
    setActionError(null);
  };

  const buildPayload = (): TeamChangePayload | null => {
    if (mode === "partner") {
      if (!selectedPlayerId) return null;
      return {
        mode: "partner",
        player_id: selectedPlayerId,
        replacement: { ...replacementPlayer },
      };
    }
    if (mode === "replace") {
      if (!selectedTeamId) return null;
      return {
        mode: "replace",
        team_id: selectedTeamId,
        replacement: { ...replacementTeam },
      };
    }
    return null;
  };

  const handleCheck = async () => {
    setActionError(null);
    const payload = buildPayload();
    if (!payload) {
      setActionError("Complétez la sélection avant de vérifier.");
      return;
    }
    if (!apiEnabled) {
      setResult(mode === "replace" ? "adjust" : "ok");
      setCheckMessage(
        mode === "replace"
          ? "Compatible avec ajustement interne du tirage."
          : "Compatible — aucune convocation ne change."
      );
      return;
    }
    setChecking(true);
    try {
      const response = await platformCheckTeamChange(tournament.id, payload);
      setResult(response.result);
      setCheckMessage(response.message);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Vérification impossible");
      setResult(null);
      setCheckMessage(null);
    } finally {
      setChecking(false);
    }
  };

  const handleApply = async () => {
    setActionError(null);
    const payload = buildPayload();
    if (!payload || !result) return;
    if (!apiEnabled) {
      window.alert("Preview : regénérerait le PDF et mettrait à jour le tournoi.");
      return;
    }
    setApplying(true);
    try {
      await platformApplyTeamChange(tournament.id, payload);
      await onApplied?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Application impossible");
    } finally {
      setApplying(false);
    }
  };

  const handleModeChange = (next: TeamChangeMode) => {
    setMode(mode === next ? null : next);
    resetForm();
  };

  return (
    <MvpPreviewShell scrollable>
      <div className="mx-auto w-full max-w-2xl pb-8 pt-2">
        <MvpAccountTopBar onBack={onBack} onLogout={onLogout} />

        <div className="pt-3">
        <WizardPageTitle
          title="Modifier les équipes"
          subtitle={`${tournament.name} — saisie manuelle puis vérification compatibilité convocations.`}
        />

        <div className="mt-8 space-y-3">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleModeChange(option.id)}
              className={[
                "w-full rounded-2xl border px-5 py-4 text-left transition",
                mode === option.id
                  ? "border-lime/35 bg-lime/[0.06]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20",
              ].join(" ")}
            >
              <p className="font-semibold text-white">{option.title}</p>
              <p className="mt-1 text-xs text-white/45">{option.hint}</p>
            </button>
          ))}
        </div>

        {mode === "partner" ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left"
          >
            <p className="field-label-tight">Joueur à remplacer</p>
            <select
              className="text-input lime-input mt-2 w-full"
              value={selectedPlayerId}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
            >
              <option value="">Sélectionner un joueur</option>
              {roster.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.label}
                </option>
              ))}
            </select>

            <PlayerReplacementFields
              title="Remplacer par"
              values={replacementPlayer}
              onChange={setReplacementPlayer}
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={() => void handleCheck()} disabled={checking || applying}>
                {checking ? "Vérification…" : "Vérifier compatibilité convocations"}
              </PrimaryButton>
              <GhostButton onClick={resetForm}>Réinitialiser</GhostButton>
            </div>
          </motion.div>
        ) : null}

        {mode === "replace" ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left"
          >
            <p className="field-label-tight">Équipe à remplacer</p>
            <select
              className="text-input lime-input mt-2 w-full"
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
            >
              <option value="">Sélectionner une équipe</option>
              {roster.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>

            <PlayerReplacementFields
              title="Remplacer par — Joueur 1"
              values={replacementTeam.joueur1}
              onChange={(joueur1) => setReplacementTeam((prev) => ({ ...prev, joueur1 }))}
            />
            <PlayerReplacementFields
              title="Remplacer par — Joueur 2"
              values={replacementTeam.joueur2}
              onChange={(joueur2) => setReplacementTeam((prev) => ({ ...prev, joueur2 }))}
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={() => void handleCheck()} disabled={checking || applying}>
                {checking ? "Vérification…" : "Vérifier compatibilité convocations"}
              </PrimaryButton>
              <GhostButton onClick={resetForm}>Réinitialiser</GhostButton>
            </div>
          </motion.div>
        ) : null}

        {actionError ? (
          <p className="mt-4 text-sm text-red-300/90">{actionError}</p>
        ) : null}

        {mode === "partner" && result === "ok" ? (
          <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-lime">
              <IconCheck className="h-4 w-4" />
              {checkMessage ?? "Compatible — aucune convocation ne change"}
            </p>
            <p className="mt-2 text-sm text-lime/75">
              Le moteur peut appliquer ce changement et regénérer le PDF sans décaler les heures.
            </p>
            <PrimaryButton onClick={() => void handleApply()} disabled={applying}>
              {applying ? "Regénération…" : "Appliquer et regénérer"}
            </PrimaryButton>
          </div>
        ) : null}

        {mode === "partner" && result === "blocked" ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-left">
            <p className="font-semibold text-red-100">{checkMessage}</p>
          </div>
        ) : null}

        {mode === "replace" && result === "adjust" ? (
          <div className="mt-6 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4 text-left">
            <p className="font-semibold text-sky-100">
              Compatible avec ajustement interne du tirage
            </p>
            <p className="mt-2 text-sm text-sky-100/75">
              {checkMessage ??
                "Proposition : permuter les TS voisins non joués pour respecter le niveau sportif — 0 convocation modifiée."}
            </p>
            <PrimaryButton onClick={() => void handleApply()} disabled={applying}>
              {applying ? "Regénération…" : "Appliquer la solution recommandée"}
            </PrimaryButton>
          </div>
        ) : null}
        </div>
      </div>
    </MvpPreviewShell>
  );
}

export function MvpPreviewAccountNav({
  active,
  onNavigate,
}: {
  active: MvpPreviewScreen;
  onNavigate: (screen: MvpPreviewScreen) => void;
}) {
  return <PreviewAccountNav active={active} onNavigate={onNavigate} />;
}