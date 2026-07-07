import type { LiveLayoutField } from "./liveTypes";

/** Bandeau cyan des encarts de match (Template_16_1J et dérivés). */
export const BRACKET_HEADER_BLUE = "#00B0F0";

export function isEmojiOverlayKey(key: string, value: string | undefined): boolean {
  if (/^(WIN|LOSE|SECOND)_/.test(key)) return true;
  if (value && /^[🏆❌🥈]/.test(value.trim())) return true;
  return false;
}

export function overlayLabel(key: string, value: string | undefined): string {
  if (value?.trim()) return value.trim();

  if (key.startsWith("WIN_")) {
    return `🏆 ${key.replace("WIN_", "")}:`;
  }
  if (key.startsWith("LOSE_")) {
    return `❌ ${key.replace("LOSE_", "")}:`;
  }
  if (key.startsWith("SECOND_")) {
    return `🥈 ${key.replace("SECOND_", "")}:`;
  }

  return "";
}

export function overlayColors(key: string): {
  backgroundColor: string;
  color: string;
} {
  if (/^(WIN|LOSE|SECOND)_/.test(key)) {
    return { backgroundColor: BRACKET_HEADER_BLUE, color: "#FFFFFF" };
  }
  return { backgroundColor: "#FFFFFF", color: "#000000" };
}

export function emojiOverlayFields(
  layoutFields: LiveLayoutField[],
  fields: Record<string, string>
): LiveLayoutField[] {
  return layoutFields.filter((field) =>
    isEmojiOverlayKey(field.key, fields[field.key])
  );
}
