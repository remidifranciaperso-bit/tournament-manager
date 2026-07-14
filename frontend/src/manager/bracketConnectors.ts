import { feedKeyFromTeamLabel } from "./formatBracketLabel";
import { inferSplitMainBracketHalf } from "./bracketBoxLayout";
import {
  childInlet,
  feedAnchor,
  parentOutlet,
  type BoxRectPct,
  type PointPct,
} from "./bracketGeometry";
import type { ParsedMatchSlot } from "./bracketSlideLayout";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";

function parentCodeFromLabel(label: string): string | null {
  const feed = feedKeyFromTeamLabel(label);
  if (!feed) return null;
  return feed.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");
}

function connectorMidX(parentRight: number, childLeft: number): number {
  return parentRight + (childLeft - parentRight) * 0.5;
}

/** Traits horizontaux depuis le milieu des parents, verticaux qui se rejoignent, puis trait unique vers le milieu de l'enfant. */
function bracketPathsToChild(
  parentRects: BoxRectPct[],
  childRect: BoxRectPct
): string[] {
  if (parentRects.length === 0) return [];

  const child = childInlet(childRect);
  const outlets = parentRects.map((rect) => parentOutlet(rect));
  const midX = connectorMidX(
    Math.max(...outlets.map((point) => point.x)),
    child.x
  );

  const paths: string[] = [];

  for (const outlet of outlets) {
    paths.push(`M ${outlet.x} ${outlet.y} L ${midX} ${outlet.y}`);
  }

  const junctionYs = [...outlets.map((point) => point.y), child.y];
  const yMin = Math.min(...junctionYs);
  const yMax = Math.max(...junctionYs);

  if (yMax - yMin > 0.05) {
    paths.push(`M ${midX} ${yMin} L ${midX} ${yMax}`);
  }

  paths.push(`M ${midX} ${child.y} L ${child.x} ${child.y}`);

  return paths;
}

/** Aucun trait entrant (comme PF sur un tableau 8 équipes). */
const NO_INCOMING_CONNECTOR_CODES = new Set(["PF", "C11_12", "C19_20"]);

/**
 * Jeu « sans trait entrant » ajusté à la slide. Sur les tableaux « miroir » à
 * 4 boîtes (12 éq. : classement 9-12 ; 20 éq. : classement 17-20), la finale des
 * perdants (C11_12 / C19_20) est reliée aux demies comme C7_8 en 8 équipes.
 * Sur les tableaux 8 boîtes (16/24 éq.) elle reste une vraie petite finale sans trait.
 */
function noIncomingCodesForSlide(slideCodes: Set<string>): Set<string> {
  const set = new Set(NO_INCOMING_CONNECTOR_CODES);
  if (slideCodes.has("C9_12_1") && !slideCodes.has("C9_16_1")) {
    set.delete("C11_12");
  }
  if (slideCodes.has("C17_20_1") && !slideCodes.has("C17_24_1")) {
    set.delete("C19_20");
  }
  return set;
}

function feedBracketPath(from: PointPct, to: PointPct): string {
  const gap = to.x - from.x;
  if (gap <= 0.2) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const midX = from.x + gap * 0.5;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

/**
 * Bracket inter-pages D2 → F dans la slide (jusqu'au bord haut/bas de l'encart).
 * Le prolongement dans la marge blanche est dessiné par ViewportCrossPageConnector.
 */
function appendSplitCrossPagePaths(
  slots: ParsedMatchSlot[],
  boxLayouts: Map<string, BoxRectPct>,
  paths: string[]
): void {
  const slideCodes = new Set(slots.map((slot) => slot.code));
  const slideHalf = inferSplitMainBracketHalf(slideCodes, slideCodes);
  if (!slideHalf) return;

  const d1 = boxLayouts.get("D1");
  const d2 = boxLayouts.get("D2");
  const f = boxLayouts.get("F");

  if (slideHalf === "upper" && d1 && f) {
    const midX = connectorMidX(parentOutlet(d1).x, childInlet(f).x);
    const fBottom = f.top + f.height;
    paths.push(`M ${midX} ${fBottom} L ${midX} 100`);
  }

  if (slideHalf === "lower" && d2) {
    const outlet = parentOutlet(d2);
    const midX = connectorMidX(outlet.x, d2.left);
    paths.push(`M ${midX} ${d2.top} L ${midX} 0`);
  }
}

export interface ViewportCrossPageStub {
  midXSlidePct: number;
  direction: "up" | "down";
}

/** Prolongement du bracket D2↔F dans la zone blanche autour de la slide. */
export function getViewportCrossPageStub(
  slots: ParsedMatchSlot[],
  boxLayouts: Map<string, BoxRectPct>
): ViewportCrossPageStub | null {
  const slideCodes = new Set(slots.map((slot) => slot.code));
  const slideHalf = inferSplitMainBracketHalf(slideCodes, slideCodes);
  if (!slideHalf) return null;

  const d1 = boxLayouts.get("D1");
  const d2 = boxLayouts.get("D2");
  const f = boxLayouts.get("F");

  if (slideHalf === "upper" && d1 && f) {
    return {
      midXSlidePct: connectorMidX(parentOutlet(d1).x, childInlet(f).x),
      direction: "down",
    };
  }

  if (slideHalf === "lower" && d2) {
    const outlet = parentOutlet(d2);
    return {
      midXSlidePct: connectorMidX(outlet.x, d2.left),
      direction: "up",
    };
  }

  return null;
}

export function buildBracketConnectors(
  slots: ParsedMatchSlot[],
  feeds: LiveLayoutField[],
  matchesByCode: Map<string, LiveMatch>,
  consumedFeeds: Set<string>,
  boxLayouts: Map<string, BoxRectPct>,
  options?: { includeFeedConnectors?: boolean }
): string[] {
  const includeFeedConnectors = options?.includeFeedConnectors ?? true;
  const slotByCode = new Map(slots.map((slot) => [slot.code, slot]));
  const feedByKey = new Map(feeds.map((field) => [field.key, field]));
  const slideCodes = new Set(slots.map((slot) => slot.code));
  const splitHalf = inferSplitMainBracketHalf(slideCodes, slideCodes);
  const noIncoming = noIncomingCodesForSlide(slideCodes);
  const paths: string[] = [];

  const parentsByChild = new Map<string, BoxRectPct[]>();
  const feedToChildLinks: Array<{ from: PointPct; to: PointPct }> = [];

  for (const slot of slots) {
    if (noIncoming.has(slot.code)) continue;

    const match = matchesByCode.get(slot.code);
    if (!match) continue;

    const childRect = boxLayouts.get(slot.code);
    if (!childRect) continue;
    const childPoint = childInlet(childRect);

    const parentCodes: string[] = [];
    const p1 = parentCodeFromLabel(match.equipe1) ?? match.parents[0];
    const p2 = parentCodeFromLabel(match.equipe2) ?? match.parents[1];

    if (p1) parentCodes.push(p1);
    if (p2 && p2 !== p1) parentCodes.push(p2);

    for (const parentCode of parentCodes) {
      // D2→F n'est court-circuité que si D2 est sur une AUTRE page (tableau 16
      // scindé, prolongement inter-pages). Sur un tableau 8 (D2 et F ensemble),
      // on trace le connecteur normalement.
      if (
        slot.code === "F" &&
        parentCode === "D2" &&
        !slotByCode.has("D2")
      ) {
        continue;
      }

      const parentSlot = slotByCode.get(parentCode);
      const parentRect = boxLayouts.get(parentCode);

      if (parentSlot && parentRect) {
        const list = parentsByChild.get(slot.code) ?? [];
        list.push(parentRect);
        parentsByChild.set(slot.code, list);
        continue;
      }

      const feedKey =
        parentCodeFromLabel(match.equipe1) === parentCode
          ? feedKeyFromTeamLabel(match.equipe1)
          : feedKeyFromTeamLabel(match.equipe2);
      const winKey = `WIN_${parentCode}`;
      const loseKey = `LOSE_${parentCode}`;
      const feedField =
        feedKey && !consumedFeeds.has(feedKey)
          ? feedByKey.get(feedKey)
          : !consumedFeeds.has(winKey)
            ? feedByKey.get(winKey)
            : !consumedFeeds.has(loseKey)
              ? feedByKey.get(loseKey)
              : undefined;

      if (feedField && includeFeedConnectors) {
        if (
          splitHalf &&
          (/^H\d+$/.test(slot.code) ||
            /^P\d+$/.test(parentCode) ||
            /^(WIN|LOSE)_H\d+$/.test(feedField.key) ||
            /^(WIN|LOSE)_P\d+$/.test(feedField.key))
        ) {
          continue;
        }

        feedToChildLinks.push({
          from: feedAnchor(feedField, "left"),
          to: childPoint,
        });
      }
    }
  }

  for (const [childCode, parentRects] of parentsByChild) {
    const childRect = boxLayouts.get(childCode);
    if (!childRect) continue;
    paths.push(...bracketPathsToChild(parentRects, childRect));
  }

  for (const { from, to } of feedToChildLinks) {
    paths.push(feedBracketPath(from, to));
  }

  appendSplitCrossPagePaths(slots, boxLayouts, paths);

  if (!includeFeedConnectors) {
    return paths;
  }

  for (const field of feeds) {
    if (consumedFeeds.has(field.key)) continue;

    const code = field.key.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");

    if (splitHalf && /^(WIN|LOSE)_H\d+$/.test(field.key)) continue;
    if (splitHalf && /^H\d+$/.test(code)) continue;
    if (noIncoming.has(code)) continue;
    if (code === "D2" && field.key === "WIN_D2" && slotByCode.has("F")) continue;

    const parentSlot = slotByCode.get(code);
    if (!parentSlot) continue;

    const parentRect = boxLayouts.get(code);
    if (!parentRect) continue;

    const from = parentOutlet(parentRect);
    const to = feedAnchor(field, "right");
    if (to.x > from.x) {
      paths.push(feedBracketPath(from, to));
    }
  }

  return paths;
}
