import { useCallback, useMemo, useState } from "react";
import {
  MvpClubSettingsScreen,
  MvpLoginScreen,
  MvpPreviewAccountNav,
  MvpTeamChangeScreen,
  MvpTournamentDashboardScreen,
  MvpTournamentsScreen,
  type MvpPreviewScreen,
} from "../preview/mvp/MvpPreviewScreens";
import {
  MOCK_CLUB,
  MOCK_TOURNAMENTS,
  type MvpClubProfile,
} from "../preview/mvp/mockMvpData";
import { MVP_PREVIEW_BUILD } from "../preview/mvp/MvpPreviewShell";

const PREVIEW_SCREENS: { id: MvpPreviewScreen; label: string }[] = [
  { id: "login", label: "Connexion" },
  { id: "tournaments", label: "Mes tournois" },
  { id: "club", label: "Paramètres club" },
  { id: "tournament", label: "Fiche tournoi" },
  { id: "teams", label: "Modifier équipes" },
];

export default function MvpPreviewPage({ production = false }: { production?: boolean }) {
  const [screen, setScreen] = useState<MvpPreviewScreen>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [clubProfile, setClubProfile] = useState<MvpClubProfile>(MOCK_CLUB);
  const [activeTournamentId, setActiveTournamentId] = useState(MOCK_TOURNAMENTS[0].id);
  const [navHistory, setNavHistory] = useState<MvpPreviewScreen[]>([]);

  const activeTournament = useMemo(
    () => MOCK_TOURNAMENTS.find((item) => item.id === activeTournamentId) ?? MOCK_TOURNAMENTS[0],
    [activeTournamentId]
  );

  const showAccountNav = loggedIn && screen !== "login" && devOpen;
  const isLogin = screen === "login";

  const navigateTo = useCallback((next: MvpPreviewScreen) => {
    setNavHistory((prev) => (screen === next ? prev : [...prev, screen]));
    setScreen(next);
  }, [screen]);

  const handleBack = useCallback(() => {
    setNavHistory((prev) => {
      const nextHistory = [...prev];
      const previous = nextHistory.pop();
      if (previous) {
        setScreen(previous);
        return nextHistory;
      }
      if (screen !== "tournaments") {
        setScreen("tournaments");
      }
      return nextHistory;
    });
  }, [screen]);

  const handleLogout = useCallback(() => {
    setLoggedIn(false);
    setNavHistory([]);
    setScreen("login");
  }, []);

  return (
    <div className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-arena-950 text-white">
      {!isLogin && !production && devOpen ? (
        <header className="shrink-0 border-b border-white/10 px-2 py-2">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-lime">
            Preview MVP · {MVP_PREVIEW_BUILD} · LOCAL UNIQUEMENT
          </p>
          <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PREVIEW_SCREENS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (entry.id !== "login") setLoggedIn(true);
                  setNavHistory([]);
                  setScreen(entry.id);
                }}
                className={[
                  "shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                  screen === entry.id
                    ? "bg-lime/15 text-lime ring-1 ring-lime/35"
                    : "bg-white/[0.04] text-white/45",
                ].join(" ")}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {showAccountNav ? (
            <div className="mt-1.5">
              <MvpPreviewAccountNav active={screen} onNavigate={navigateTo} />
            </div>
          ) : null}
        </header>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {screen === "login" ? (
          <MvpLoginScreen
            onLogin={() => {
              setLoggedIn(true);
              setNavHistory([]);
              setScreen("tournaments");
            }}
          />
        ) : null}

        {screen === "tournaments" ? (
          <MvpTournamentsScreen
            profile={clubProfile}
            onOpenTournament={(id) => {
              setActiveTournamentId(id);
              navigateTo("tournament");
            }}
            onNewTournament={() => {
              window.alert("Preview : ouvrirait Engine V2 wizard pré-rempli avec le profil club.");
            }}
            onEditClub={() => navigateTo("club")}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "club" ? (
          <MvpClubSettingsScreen
            profile={clubProfile}
            onSave={setClubProfile}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "tournament" ? (
          <MvpTournamentDashboardScreen
            tournament={activeTournament}
            onModifyTeams={() => navigateTo("teams")}
            onLaunchLive={() => {
              window.alert("Preview : ouvrirait Live V2 avec le snapshot de ce tournoi.");
            }}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "teams" ? (
          <MvpTeamChangeScreen
            tournament={activeTournament}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}
      </div>

      {!isLogin && !production ? (
        <button
          type="button"
          onClick={() => setDevOpen((open) => !open)}
          className="absolute bottom-3 right-3 z-50 rounded-lg border border-white/20 bg-black/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm"
        >
          {devOpen ? "Masquer dev" : "Écrans preview"}
        </button>
      ) : null}
    </div>
  );
}
