import { useMemo } from "react";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import {
  parseBracketSlide,
  SLIDE_ASPECT,
  type ParsedMatchSlot,
} from "./bracketSlideLayout";
import { buildBracketConnectors } from "./bracketConnectors";
import { matchBoxPosition } from "./bracketGeometry";
import {
  ptOnSlide,
  STANDARD_MATCH_BOX,
  TEMPLATE_PT,
} from "./bracketTemplateMetrics";
import {
  feedKeyFromTeamLabel,
  formatFeedKey,
  formatTeamSlot,
} from "./formatBracketLabel";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import type { StoredMatchResult } from "./useLiveProgress";

function pctStyle(field: LiveLayoutField) {
  return {
    left: `${field.left}%`,
    top: `${field.top}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
  };
}

function resolveFeedContent(
  key: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const win = key.match(/^WIN_(.+)$/);
  const lose = key.match(/^LOSE_(.+)$/);
  const parentCode = win?.[1] ?? lose?.[1];
  if (!parentCode) return formatFeedKey(key);

  const parent = matchesByCode.get(parentCode);
  const result = matchResults[parentCode];
  if (!parent || !result) return formatFeedKey(key);

  const side = win ? result.winner : result.loser;
  const raw = side === 1 ? parent.equipe1 : parent.equipe2;
  const resolved = resolveTeamLabelDeep(raw, matchesByCode, matchResults);
  return resolved || formatFeedKey(key);
}

function resolveTeamDisplay(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const resolved = resolveTeamLabelDeep(label, matchesByCode, matchResults);
  if (resolved !== label.trim()) return resolved;
  return formatTeamSlot(label);
}

function TemplateMatchBox({
  match,
  slot,
  team1,
  team2,
  scaleH,
}: {
  match: LiveMatch;
  slot: ParsedMatchSlot;
  team1: string;
  team2: string;
  scaleH: number;
}) {
  const pos = matchBoxPosition(slot);
  const codePx = ptOnSlide(TEMPLATE_PT.matchCode, scaleH);
  const teamPx = ptOnSlide(TEMPLATE_PT.team, scaleH);
  const vsPx = ptOnSlide(TEMPLATE_PT.vs, scaleH);

  return (
    <div
      className="absolute z-10 flex flex-col overflow-hidden border border-template-blue/30 bg-white shadow-sm"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${STANDARD_MATCH_BOX.widthPct}%`,
        height: `${STANDARD_MATCH_BOX.heightPct}%`,
      }}
    >
      {/* Bannière : heure (gauche) · terrain (centre) · code (droite) */}
      <div
        className="grid shrink-0 grid-cols-3 items-center bg-template-blue px-[0.35em] font-tsl font-semibold leading-none text-white"
        style={{
          height: "26%",
          fontSize: codePx,
        }}
      >
        <span className="truncate text-left">{match.heure ?? ""}</span>
        <span className="truncate text-center">{match.terrain ?? ""}</span>
        <span className="truncate text-right">{match.code}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex flex-1 items-center justify-center overflow-hidden px-1 text-center font-noto font-medium leading-tight text-arena-800"
          style={{ fontSize: teamPx }}
        >
          <span className="line-clamp-2 break-words">{team1}</span>
        </div>
        <div
          className="flex shrink-0 items-center justify-center font-noto font-semibold text-arena-600"
          style={{ height: "14%", fontSize: vsPx }}
        >
          vs
        </div>
        <div
          className="flex flex-1 items-center justify-center overflow-hidden px-1 text-center font-noto font-medium leading-tight text-arena-800"
          style={{ fontSize: teamPx }}
        >
          <span className="line-clamp-2 break-words">{team2}</span>
        </div>
      </div>
    </div>
  );
}

function FeedLabel({
  field,
  text,
  scaleH,
}: {
  field: LiveLayoutField;
  text: string;
  scaleH: number;
}) {
  return (
    <div
      className="absolute z-10 flex items-center overflow-hidden border border-template-blue/35 bg-template-blue/10 px-[0.3em] font-noto font-medium leading-tight text-arena-800"
      style={{
        ...pctStyle(field),
        fontSize: ptOnSlide(TEMPLATE_PT.feedLabel, scaleH),
      }}
    >
      <span className="line-clamp-2 break-words">{text}</span>
    </div>
  );
}

function BracketConnectors({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="#00B0F0"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

interface LiveBracketSlideProps {
  fields: LiveLayoutField[];
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  renderWidth: number;
}

export function LiveBracketSlide({
  fields,
  matches,
  matchResults,
  renderWidth,
}: LiveBracketSlideProps) {
  const parsed = useMemo(() => parseBracketSlide(fields), [fields]);
  const matchesByCode = useMemo(() => buildMatchesByCode(matches), [matches]);

  const renderHeight = Math.round(renderWidth / SLIDE_ASPECT);
  const consumedFeeds = useMemo(() => {
    const set = new Set<string>();
    for (const slot of parsed.matches) {
      const match = matchesByCode.get(slot.code);
      if (!match) continue;
      const feed1 = feedKeyFromTeamLabel(match.equipe1);
      const feed2 = feedKeyFromTeamLabel(match.equipe2);
      if (feed1) set.add(feed1);
      if (feed2) set.add(feed2);
    }
    return set;
  }, [parsed.matches, matchesByCode]);

  const connectorPaths = useMemo(
    () =>
      buildBracketConnectors(
        parsed.matches,
        parsed.feeds,
        matchesByCode,
        consumedFeeds
      ),
    [parsed.matches, parsed.feeds, matchesByCode, consumedFeeds]
  );

  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white shadow-sm ring-1 ring-arena-600/10"
      style={{ width: renderWidth, height: renderHeight }}
    >
      <BracketConnectors paths={connectorPaths} />

      {parsed.matches.map((slot) => {
        const match = matchesByCode.get(slot.code);
        if (!match) return null;

        const team1 = resolveTeamDisplay(
          match.equipe1,
          matchesByCode,
          matchResults
        );
        const team2 = resolveTeamDisplay(
          match.equipe2,
          matchesByCode,
          matchResults
        );

        return (
          <TemplateMatchBox
            key={slot.code}
            match={match}
            slot={slot}
            team1={team1}
            team2={team2}
            scaleH={renderHeight}
          />
        );
      })}

      {parsed.feeds
        .filter((field) => !consumedFeeds.has(field.key))
        .map((field) => (
          <FeedLabel
            key={field.key}
            field={field}
            text={resolveFeedContent(field.key, matchesByCode, matchResults)}
            scaleH={renderHeight}
          />
        ))}
    </div>
  );
}
