/**
 * Erkennt Legacy-Hugo-URLs der Form /YYYY/MM/DD/<dtag>.html oder .../<dtag>.html/
 * und gibt den dtag-Teil zurück. Für alle anderen Pfade: null.
 */
export function parseLegacyUrl(path: string): string | null {
  const match = path.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+?)\.html\/?$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

/**
 * Erzeugt die kanonische kurze Post-URL /<dtag>/.
 */
export function canonicalPostPath(dtag: string): string {
  return `/${encodeURIComponent(dtag)}/`;
}
