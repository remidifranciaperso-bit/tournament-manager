import { useMemo, useState, type ReactNode } from "react";
import { PadelCourtOutline } from "../components/CourtBackground";
import type { MatchFormatCode } from "./matchFormats";
import type { CourtMatchDisplay } from "./liveCourtMatches";
import { getSetScoreOptions } from "./matchScoreRules";
import type { SetScore } from "./matchScoreRules";
import { parseTeamLabel, type ParsedTeam } from "./parseTeamLabel";

export const COURT_WIDTH_PX = 280;
export const COURT_HEIGHT_PX = 560;

export function formatMatchName(match: CourtMatchDisplay): string {
  return `${match.code} — ${match.tour}`;
}

function GamesSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="mt-1.5 w-full max-w-[5.5rem] rounded-md border border-lime/30 bg-arena-950/90 px-1.5 py-1 text-center text-[13px] font-semibold text-lime focus:border-lime/50 focus:outline-none"
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
}: {
  team: ParsedTeam;
  scoringMode: boolean;
  games?: number;
  gameOptions?: number[];
  onGamesChange?: (value: number) => void;
}) {
  return (
    <div className="max-w-[92%] rounded-lg border border-white/30 bg-arena-950/80 px-2.5 py-2 text-center shadow-sm">
      <p className="text-[14px] font-medium leading-snug text-white sm:text-[15px]">
        {team.player1}
      </p>
      {team.player2 && (
        <p className="mt-0.5 text-[14px] font-medium leading-snug text-white sm:text-[15px]">
          {team.player2}
        </p>
      )}
      {scoringMode && gameOptions && onGamesChange ? (
        <GamesSelect
          value={games ?? 0}
          options={gameOptions}
          onChange={onGamesChange}
          label={`Jeux ${team.player1}`}
        />
      ) : (
        team.seed && (
          <p className="mt-1 text-[14px] font-semibold uppercase tracking-wide text-lime/90 sm:text-[15px]">
            {team.seed}
          </p>
        )
      )}
    </div>
  );
}

function WinnerBadge({ team }: { team: ParsedTeam }) {
  const names = team.player2
    ? `${team.player1} / ${team.player2}`
    : team.player1;

  return (
    <div className="max-w-[90%] rounded-xl border border-lime/40 bg-arena-950/90 px-3 py-2 text-center shadow-md">
      <p className="text-[11px] font-bold uppercase tracking-wide text-lime sm:text-xs">
        Gagnants :
      </p>
      <p className="mt-0.5 text-[12px] font-semibold leading-snug text-lime sm:text-[13px]">
        {names}
      </p>
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
}

export function LiveCourtCard({
  terrainName,
  match,
  footer,
  emptyLabel = "Aucun match",
  scoring,
}: LiveCourtCardProps) {
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

  return (
    <div className="flex shrink-0 flex-col items-center">
      <p className="field-label-section mb-2 max-w-[280px] truncate px-1 text-center">
        {terrainName}
      </p>

      {match && (
        <p className="mb-2 max-w-[280px] truncate px-1 text-center text-[12px] font-medium text-white/65 sm:text-[13px]">
          {formatMatchName(match)}
        </p>
      )}

      {scoringMode && scoring && scoring.setCount > 1 && (
        <div className="mb-2 flex gap-1">
          {Array.from({ length: scoring.setCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scoring.onSetChange(index)}
              className={[
                "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                index === activeSet
                  ? "bg-lime/15 text-lime ring-1 ring-lime/35"
                  : "bg-white/[0.05] text-white/45 hover:text-white/70",
              ].join(" ")}
            >
              {index === 2 ? "STB" : `Set ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <div
        className="relative shrink-0"
        style={{
          width: COURT_WIDTH_PX,
          height: COURT_HEIGHT_PX,
        }}
      >
        <PadelCourtOutline className="h-full w-full" />

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
              />
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              {scoringMode && scoring?.winnerTeam ? (
                <WinnerBadge team={scoring.winnerTeam} />
              ) : (
                !scoringMode && (
                  <span className="rounded-full border border-lime/35 bg-arena-950/85 px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-lime sm:text-base">
                    vs
                  </span>
                )
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
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <p className="text-center text-sm text-white/35">{emptyLabel}</p>
          </div>
        )}
      </div>
      {footer}
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
}

export function LiveCourtsRow({
  terrains,
  matchByTerrain,
  renderFooter,
  getScoring,
  emptyLabel,
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
