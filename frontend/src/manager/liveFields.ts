/** Clés figées dans le masque PNG (emojis WIN/LOSE déjà rendus par LibreOffice). */
export function isStaticTemplateKey(key: string): boolean {
  return (
    key.startsWith("WIN_") ||
    key.startsWith("LOSE_") ||
    key.startsWith("SECOND_")
  );
}

/** Placeholders remplis dynamiquement au fil du live (scores, noms, etc.). */
export function isDynamicField(key: string): boolean {
  return !isStaticTemplateKey(key);
}

export function fieldValue(
  fields: Record<string, string>,
  key: string
): string {
  return fields[key] ?? "";
}
