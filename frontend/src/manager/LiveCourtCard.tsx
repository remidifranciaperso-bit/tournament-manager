import { useMemo, useState, type ReactNode } from "react";
import { PadelCourtFilled, PadelCourtOutline } from "../components/CourtBackground";
import type { MatchFormatCode } from "./matchFormats";
import type { CourtMatchDisplay } from "./liveCourtMatches";
import { getSetScoreOptions } from "./matchScoreRules";
import type { SetScore } from "./matchScoreRules";
import { parseTeamLabel, type ParsedTeam } from "./parseTeamLabel";

export const COURT_WIDTH_PX = 280;
export const COURT_HEIGHT_PX = 560;
/** Hauteur fixe sous le terrain (bouton score ou heure prévue). */
export const COURT_FOOTER_MIN_H_PX = 76;

export type LiveCourtTheme = "dark" | "light";

export function formatMatchName(match: CourtMatchDisplay): string {
  return `${match.code} — ${match.tour}`;
}

export function CourtFooterSlot({ children }: { children?: ReactNode }) {
  return (
    <div
      className="mt-3 flex w-full max-w-[280px] flex-col justify-start gap-1.5"
      style={{ minHeight: COURT_FOOTER_MIN_H_PX }}
    >
      {children}
    </div>
  );
}

export function CourtScheduledTime({ heure }: { heure: string | null }) {
  return (
    <CourtFooterSlot>
      <div className="flex min-h-[41px] w-full items-center justify-center rounded-xl border border-arena-600/30 bg-arena-600/10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-arena-700">
        {heure ? `Prévu ${heure}` : "Heure à confirmer"}
      </div>
    </CourtFooterSlot>
  );
}

const COURT_THEME = {
  dark: {
    terrainLabel:
      "field-label-section max-w-[280px] truncate px-1 text-center",
    matchName:
      "max-w-[280px] truncate px-1 text-center text-[12px] font-medium text-white/65 sm:text-[13px]",
    teamBadge: "max-w-[92%] rounded-lg border border-white/30 bg-arena-950/80 px-2.5 py-2 text-center shadow-sm",
    playerName: "text-[14px] font-medium leading-snug text-white sm:text-[15px]",
    seed: "mt-1 text-[14px] font-semibold uppercase tracking-wide text-lime/90 sm:text-[15px]",
    gamesSelect:
      "mt-1.5 w-full max-w-[5.5rem] rounded-md border border-lime/30 bg-arena-950/90 px-1.5 py-1 text-center text-[13px] font-semibold text-lime focus:border-lime/50 focus:outline-none",
    vs: "rounded-full border border-lime/35 bg-arena-950/85 px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-lime sm:text-base",
    winnerBox:
      "max-w-[90%] rounded-xl border border-lime/40 bg-arena-950/90 px-3 py-2 text-center shadow-md",
    winnerTitle:
      "text-[11px] font-bold uppercase tracking-wide text-lime sm:text-xs",
    winnerNames:
      "mt-0.5 text-[12px] font-semibold leading-snug text-lime sm:text-[13px]",
    empty: "text-center text-sm text-white/35",
    setActive: "bg-lime/15 text-lime ring-1 ring-lime/35",
    setInactive: "bg-white/[0.05] text-white/45 hover:text-white/70",
    court: "outline" as const,
  },
  light: {
    terrainLabel:
      "max-w-[280px] truncate px-1 text-center text-sm font-semibold uppercase tracking-widest text-arena-700 sm:text-base",
    matchName:
      "max-w-[280px] truncate px-1 text-center text-[12px] font-medium text-arena-600 sm:text-[13px]",
    teamBadge:
      "max-w-[92%] rounded-lg border border-arena-600/20 bg-white/95 px-2.5 py-2 text-center shadow-sm",
    playerName:
      "text-[14px] font-medium leading-snug text-arena-800 sm:text-[15px]",
    seed: "mt-1 text-[14px] font-semibold uppercase tracking-wide text-arena-600 sm:text-[15px]",
    gamesSelect:
      "mt-1.5 w-full max-w-[5.5rem] rounded-md border border-arena-600/30 bg-white px-1.5 py-1 text-center text-[13px] font-semibold text-arena-700 focus:border-arena-600/50 focus:outline-none",
    vs: "rounded-full border border-arena-600/35 bg-white px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-arena-700 sm:text-base",
    winnerBox:
      "max-w-[90%] rounded-xl border border-arena-600/35 bg-white px-3 py-2 text-center shadow-md",
    winnerTitle:
      "text-[11px] font-bold uppercase tracking-wide text-arena-600 sm:text-xs",
    winnerNames:
      "mt-0.5 text-[12px] font-semibold leading-snug text-arena-800 sm:text-[13px]",
    empty: "text-center text-sm text-arena-400",
    setActive: "bg-white/90 text-arena-700 ring-1 ring-white/80",
    setInactive: "bg-white/25 text-white/80 hover:bg-white/40 hover:text-white",
    court: "filled" as const,
  },
} as const;

function GamesSelect({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  label: string;
  className: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className={className}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TeamBadge({
  team,
  scoringMode,
  games,
  gameOptions,
  onGamesChange,
  theme,
}: {
  team: ParsedTeam;
  scoringMode: boolean;
  games?: number;
  gameOptions?: number[];
  onGamesChange?: (value: number) => void;
  theme: (typeof COURT_THEME)[LiveCourtTheme];
}) {
  return (
    <div className={theme.teamBadge}>
      <p className={theme.playerName}>{team.player1}</p>
      {team.player2 && (
        <p className={`mt-0.5 ${theme.playerName}`}>{team.player2}</p>
      )}
      <div className="mt-1 flex min-h-[1.75rem] items-center justify-center">
        {scoringMode && gameOptions && onGamesChange ? (
          <GamesSelect
            value={games ?? 0}
            options={gameOptions}
            onChange={onGamesChange}
            label={`Jeux ${team.player1}`}
            className={`${theme.gamesSelect} mt-0`}
          />
        ) : (
          team.seed && <p className={`${theme.seed} mt-0`}>{team.seed}</p>
        )}
      </div>
    </div>
  );
}

function WinnerBadge({
  team,
  theme,
}: {
  team: ParsedTeam;
  theme: (typeof COURT_THEME)[LiveCourtTheme];
}) {
  const names = team.player2
    ? `${team.player1} / ${team.player2}`
    : team.player1;

  return (
    <div className={theme.winnerBox}>
      <p className={theme.winnerTitle}>Gagnants :</p>
      <p className={theme.winnerNames}>{names}</p>
    </div>
  );
}

export interface CourtScoringState {
  format: MatchFormatCode;
  sets: SetScore[];
  activeSetIndex: number;
  setCount: number;
  winnerTeam: ParsedTeam | null;
  onSetChange: (index: number) => void;
  onGamesChange: (
    setIndex: number,
    side: "team1" | "team2",
    value: number
  ) => void;
}

interface LiveCourtCardProps {
  terrainName: string;
  match: CourtMatchDisplay | null;
  footer?: ReactNode;
  emptyLabel?: string;
  scoring?: CourtScoringState;
  theme?: LiveCourtTheme;
}

export function LiveCourtCard({
  terrainName,
  match,
  footer,
  emptyLabel = "Aucun match",
  scoring,
  theme: themeName = "dark",
}: LiveCourtCardProps) {
  const theme = COURT_THEME[themeName];

  const equipe1 = useMemo(
    () => (match ? parseTeamLabel(match.equipe1) : null),
    [match]
  );
  const equipe2 = useMemo(
    () => (match ? parseTeamLabel(match.equipe2) : null),
    [match]
  );

  const scoringMode = Boolean(scoring);
  const activeSet = scoring?.activeSetIndex ?? 0;
  const activeSetScore = scoring?.sets[activeSet];
  const gameOptions = scoring
    ? getSetScoreOptions(scoring.format, activeSet)
    : [];

  const CourtGraphic =
    theme.court === "filled" ? PadelCourtFilled : PadelCourtOutline;

  const showSetTabs =
    scoringMode && scoring && scoring.setCount > 1;

  return (
    <div className="flex w-[280px] shrink-0 flex-col items-center">
      <div className="mb-2 flex w-full flex-col items-center gap-2">
        <p className={theme.terrainLabel}>{terrainName}</p>
        <div className="flex h-5 w-full items-center justify-center">
          <p className={theme.matchName}>
            {match ? formatMatchName(match) : "\u00A0"}
          </p>
        </div>
      </div>

      <div
        className="relative shrink-0"
        style={{
          width: COURT_WIDTH_PX,
          height: COURT_HEIGHT_PX,
        }}
      >
        <CourtGraphic className="h-full w-full" />

        {showSetTabs && (
          <div className="absolute inset-x-0 top-2 z-20 flex justify-center gap-1 px-2">
            {Array.from({ length: scoring!.setCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scoring!.onSetChange(index)}
                className={[
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                  index === activeSet ? theme.setActive : theme.setInactive,
                ].join(" ")}
              >
                {index === 2 ? "STB" : `Set ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        {match && equipe1 && equipe2 ? (
          <>
            <div className="absolute inset-x-0 top-0 z-10 flex h-1/2 items-center justify-center px-2">
              <TeamBadge
                team={equipe1}
                scoringMode={scoringMode}
                games={activeSetScore?.team1}
                gameOptions={gameOptions}
                onGamesChange={
                  scoring
                    ? (value) =>
                        scoring.onGamesChange(activeSet, "team1", value)
                    : undefined
                }
                theme={theme}
              />
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              {scoringMode && scoring?.winnerTeam ? (
                <WinnerBadge team={scoring.winnerTeam} theme={theme} />
              ) : (
                !scoringMode && <span className={theme.vs}>vs</span>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 flex h-1/2 items-center justify-center px-2">
              <TeamBadge
                team={equipe2}
                scoringMode={scoringMode}
                games={activeSetScore?.team2}
                gameOptions={gameOptions}
                onGamesChange={
                  scoring
                    ? (value) =>
                        scoring.onGamesChange(activeSet, "team2", value)
                    : undefined
                }
                theme={theme}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <p className={theme.empty}>{emptyLabel}</p>
          </div>
        )}
      </div>

      {footer ?? <CourtFooterSlot />}
    </div>
  );
}

interface LiveCourtsRowProps {
  terrains: string[];
  matchByTerrain: Map<string, CourtMatchDisplay | null>;
  renderFooter?: (terrain: string, match: CourtMatchDisplay | null) => ReactNode;
  getScoring?: (
    terrain: string,
    match: CourtMatchDisplay | null
  ) => CourtScoringState | undefined;
  emptyLabel?: string;
  theme?: LiveCourtTheme;
}

export function LiveCourtsRow({
  terrains,
  matchByTerrain,
  renderFooter,
  getScoring,
  emptyLabel,
  theme = "dark",
}: LiveCourtsRowProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto overscroll-x-contain px-4 py-6 sm:px-8">
      <div className="flex shrink-0 items-start justify-center gap-8 sm:gap-12">
        {terrains.map((name) => {
          const match = matchByTerrain.get(name) ?? null;
          return (
            <LiveCourtCard
              key={name}
              terrainName={name}
              match={match}
              emptyLabel={emptyLabel}
              scoring={getScoring?.(name, match)}
              footer={renderFooter?.(name, match)}
              theme={theme}
            />
          );
        })}
      </div>
    </div>
  );
}

export function useScoreFormToggle() {
  const [openTerrain, setOpenTerrain] = useState<string | null>(null);

  return {
    openTerrain,
    open: (terrain: string) => setOpenTerrain(terrain),
    close: () => setOpenTerrain(null),
    isOpen: (terrain: string) => openTerrain === terrain,
  };
}
