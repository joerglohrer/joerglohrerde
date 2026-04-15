/**
 * Erkennt Legacy-Hugo-URLs der Form /YYYY/MM/DD/<dtag>.html oder .../<dtag>.html/
 * und gibt den dtag-Teil zurück. Für alle anderen Pfade: null.
 *
 * Erwartet nur den Pfad ohne Query/Fragment — wenn vorhanden vom Aufrufer
 * trennen. `decodeURIComponent` wird defensiv gekapselt, damit malformed
 * Percent-Encoding die SPA beim Boot nicht crasht.
 */
export function parseLegacyUrl(path: string): string | null {
  const match = path.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+?)\.html\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Erzeugt die kanonische kurze Post-URL /<dtag>/.
 */
export function canonicalPostPath(dtag: string): string {
  return `/${encodeURIComponent(dtag)}/`;
}
