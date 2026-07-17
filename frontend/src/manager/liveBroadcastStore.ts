import type { BroadcastableTab, RetransmissionMode } from "./liveRetransmission";

const OUTPUT_PREFIX = "manager-broadcast-output-";
const INDEX_PREFIX = "manager-broadcast-index-";

export interface BroadcastOutput {
  version: 1;
  outputToken: string;
  liveToken: string;
  displayId: string;
  displayLabel: string;
  mode: RetransmissionMode;
  tabs: BroadcastableTab[];
  /** Onglet affiché en mode fixe. */
  fixedTab: BroadcastableTab | null;
  /** Onglet dédié en mode multi (un écran = un onglet). */
  dedicatedTab: BroadcastableTab | null;
  rotationSeconds: number;
  createdAt: number;
}

function outputKey(token: string): string {
  return `${OUTPUT_PREFIX}${token}`;
}

function indexKey(liveToken: string): string {
  return `${INDEX_PREFIX}${liveToken}`;
}

export function buildAffichageUrl(outputToken: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/manager/affichage/${outputToken}`;
}

export function saveBroadcastOutput(output: BroadcastOutput): void {
  localStorage.setItem(outputKey(output.outputToken), JSON.stringify(output));

  const raw = localStorage.getItem(indexKey(output.liveToken));
  const tokens = raw ? (JSON.parse(raw) as string[]) : [];
  if (!tokens.includes(output.outputToken)) {
    localStorage.setItem(
      indexKey(output.liveToken),
      JSON.stringify([...tokens, output.outputToken])
    );
  }
}

export function loadBroadcastOutput(outputToken: string): BroadcastOutput | null {
  try {
    const raw = localStorage.getItem(outputKey(outputToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BroadcastOutput;
    if (parsed.version !== 1 || !parsed.liveToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listBroadcastOutputs(liveToken: string): BroadcastOutput[] {
  try {
    const raw = localStorage.getItem(indexKey(liveToken));
    if (!raw) return [];
    const tokens = JSON.parse(raw) as string[];
    return tokens
      .map((token) => loadBroadcastOutput(token))
      .filter((output): output is BroadcastOutput => output !== null);
  } catch {
    return [];
  }
}

export function deleteBroadcastOutput(
  outputToken: string,
  liveToken: string
): void {
  localStorage.removeItem(outputKey(outputToken));
  try {
    const raw = localStorage.getItem(indexKey(liveToken));
    if (!raw) return;
    const tokens = (JSON.parse(raw) as string[]).filter(
      (token) => token !== outputToken
    );
    if (tokens.length === 0) {
      localStorage.removeItem(indexKey(liveToken));
    } else {
      localStorage.setItem(indexKey(liveToken), JSON.stringify(tokens));
    }
  } catch {
    localStorage.removeItem(indexKey(liveToken));
  }
}

export function clearBroadcastSession(liveToken: string): void {
  const outputs = listBroadcastOutputs(liveToken);
  for (const output of outputs) {
    localStorage.removeItem(outputKey(output.outputToken));
  }
  localStorage.removeItem(indexKey(liveToken));
}

export function createOutputToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
