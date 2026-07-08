import { useMemo } from "react";
import type { LiveLayoutField, LiveMatch, LiveTournamentMeta } from "./liveTypes";
import {
  parseBracketSlide,
  SLIDE_ASPECT,
  type ParsedMatchSlot,
} from "./bracketSlideLayout";
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

function fontSizePx(containerH: number, pctHeight: number, ratio: number) {
  return Math.max(7, Math.round(containerH * (pctHeight / 100) * ratio));
}

function SlideHeaderBand({
  typeField,
  dateField,
  typeLabel,
  dateLabel,
  scaleH,
}: {
  typeField?: LiveLayoutField;
  dateField?: LiveLayoutField;
  typeLabel: string;
  dateLabel: string;
  scaleH: number;
}) {
  if (!typeField && !dateField) return null;

  return (
    <>
      {typeField && (
        <div
          className="absolute flex items-center overflow-hidden bg-template-blue px-[0.35em] font-tsl font-semibold uppercase tracking-wide text-white"
          style={{
            ...pctStyle(typeField),
            fontSize: fontSizePx(scaleH, typeField.height, 0.62),
          }}
        >
          <span className="truncate">{typeLabel}</span>
        </div>
      )}
      {dateField && (
        <div
          className="absolute flex items-center justify-end overflow-hidden bg-template-blue px-[0.35em] font-tsl font-semibold text-white"
          style={{
            ...pctStyle(dateField),
            fontSize: fontSizePx(scaleH, dateField.height, 0.62),
          }}
        >
          <span className="truncate">{dateLabel}</span>
        </div>
      )}
    </>
  );
}

function MatchHeaderRow({
  slot,
  match,
  scaleH,
}: {
  slot: ParsedMatchSlot;
  match: LiveMatch;
  scaleH: number;
}) {
  const headerH = slot.codeField?.height ?? slot.bounds.height;
  const fontSize = fontSizePx(scaleH, headerH, 0.58);

  const style = slot.terrainField
    ? pctStyle(slot.terrainField)
    : slot.codeField
      ? pctStyle(slot.codeField)
      : pctStyle({
          ...slot.bounds,
          key: slot.code,
          left: slot.bounds.left,
          top: slot.bounds.top,
          width: slot.bounds.width,
          height: Math.min(slot.bounds.height, headerH),
        });

  return (
    <div
      className="absolute flex items-center gap-[0.4em] overflow-hidden bg-template-blue px-[0.35em] font-tsl font-semibold text-white"
      style={{ ...style, fontSize }}
    >
      <span className="shrink-0">{match.code}</span>
      {match.heure && (
        <span className="shrink-0 opacity-95">{match.heure}</span>
      )}
      {match.terrain && (
        <span className="ml-auto truncate text-right">{match.terrain}</span>
      )}
    </div>
  );
}

function TeamRow({
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
      className="absolute flex items-center justify-center overflow-hidden border border-template-blue/25 bg-white px-1 text-center font-noto font-medium leading-tight text-arena-800"
      style={{
        ...pctStyle(field),
        fontSize: fontSizePx(scaleH, field.height, 0.55),
      }}
    >
      <span className="line-clamp-2 break-words">{text}</span>
    </div>
  );
}

function VsDivider({
  eq1: eq1Field,
  eq2: eq2Field,
  scaleH,
}: {
  eq1: LiveLayoutField;
  eq2: LiveLayoutField;
  scaleH: number;
}) {
  const top = eq1Field.top + eq1Field.height;
  const height = Math.max(0.8, eq2Field.top - top);

  return (
    <div
      className="absolute flex items-center justify-center font-noto font-semibold text-arena-600"
      style={{
        left: `${Math.min(eq1Field.left, eq2Field.left)}%`,
        top: `${top}%`,
        width: `${Math.max(eq1Field.width, eq2Field.width)}%`,
        height: `${height}%`,
        fontSize: fontSizePx(scaleH, height, 0.5),
      }}
    >
      vs
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
      className="absolute flex items-center overflow-hidden border border-template-blue/35 bg-template-blue/10 px-[0.3em] font-noto font-medium leading-tight text-arena-800"
      style={{
        ...pctStyle(field),
        fontSize: fontSizePx(scaleH, field.height, 0.52),
      }}
    >
      <span className="line-clamp-2 break-words">{text}</span>
    </div>
  );
}

function CompactTeam({
  slot,
  row,
  text,
  scaleH,
}: {
  slot: ParsedMatchSlot;
  row: "top" | "bottom";
  text: string;
  scaleH: number;
}) {
  const headerBottom =
    (slot.codeField?.top ?? slot.bounds.top) +
    (slot.codeField?.height ?? slot.bounds.height * 0.35);
  const rowHeight = slot.bounds.height * 0.28;
  const top = row === "top" ? headerBottom : headerBottom + rowHeight;

  return (
    <div
      className="absolute flex items-center justify-center overflow-hidden border border-template-blue/25 bg-white px-1 text-center font-noto font-medium leading-tight text-arena-800"
      style={{
        left: `${slot.bounds.left}%`,
        top: `${top}%`,
        width: `${slot.bounds.width}%`,
        height: `${rowHeight}%`,
        fontSize: fontSizePx(scaleH, rowHeight, 0.5),
      }}
    >
      <span className="line-clamp-2 break-words">{text}</span>
    </div>
  );
}

interface LiveBracketSlideProps {
  fields: LiveLayoutField[];
  matches: LiveMatch[];
  meta: LiveTournamentMeta;
  matchResults: Record<string, StoredMatchResult>;
  renderWidth: number;
}

export function LiveBracketSlide({
  fields,
  matches,
  meta,
  matchResults,
  renderWidth,
}: LiveBracketSlideProps) {
  const parsed = useMemo(() => parseBracketSlide(fields), [fields]);
  const matchesByCode = useMemo(() => buildMatchesByCode(matches), [matches]);
  const feedByKey = useMemo(
    () => new Map(parsed.feeds.map((f) => [f.key, f])),
    [parsed.feeds]
  );

  const renderHeight = Math.round(renderWidth / SLIDE_ASPECT);
  const consumedFeeds = new Set<string>();

  const dateLabel = meta.date_tournoi
    ? meta.date_tournoi.split("-").reverse().join("/")
    : "";

  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white shadow-sm ring-1 ring-arena-600/10"
      style={{ width: renderWidth, height: renderHeight }}
    >
      <SlideHeaderBand
        typeField={parsed.typeField}
        dateField={parsed.dateField}
        typeLabel={meta.type_tournoi}
        dateLabel={dateLabel}
        scaleH={renderHeight}
      />

      {parsed.matches.map((slot) => {
        const match = matchesByCode.get(slot.code);
        if (!match) return null;

        if (slot.hasTeams) {
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
            <div key={slot.code}>
              <MatchHeaderRow slot={slot} match={match} scaleH={renderHeight} />
              {slot.eq1Field && (
                <TeamRow field={slot.eq1Field} text={team1} scaleH={renderHeight} />
              )}
              {slot.eq1Field && slot.eq2Field && (
                <VsDivider
                  eq1={slot.eq1Field}
                  eq2={slot.eq2Field}
                  scaleH={renderHeight}
                />
              )}
              {slot.eq2Field && (
                <TeamRow field={slot.eq2Field} text={team2} scaleH={renderHeight} />
              )}
            </div>
          );
        }

        const feed1 = feedKeyFromTeamLabel(match.equipe1);
        const feed2 = feedKeyFromTeamLabel(match.equipe2);
        const feed1Field = feed1 ? feedByKey.get(feed1) : undefined;
        const feed2Field = feed2 ? feedByKey.get(feed2) : undefined;

        if (feed1) consumedFeeds.add(feed1);
        if (feed2) consumedFeeds.add(feed2);

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
          <div key={slot.code}>
            <MatchHeaderRow slot={slot} match={match} scaleH={renderHeight} />
            {feed1Field ? (
              <FeedLabel field={feed1Field} text={team1} scaleH={renderHeight} />
            ) : (
              <CompactTeam
                slot={slot}
                row="top"
                text={team1}
                scaleH={renderHeight}
              />
            )}
            {feed2Field ? (
              <FeedLabel field={feed2Field} text={team2} scaleH={renderHeight} />
            ) : (
              <CompactTeam
                slot={slot}
                row="bottom"
                text={team2}
                scaleH={renderHeight}
              />
            )}
          </div>
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
