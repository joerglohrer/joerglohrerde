import { describe, expect, it } from 'vitest';
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy';

describe('parseLegacyUrl', () => {
  it('extrahiert dtag aus der Hugo-URL-Form mit Trailing-Slash', () => {
    expect(parseLegacyUrl('/2025/03/04/dezentrale-oep-oer.html/')).toBe(
      'dezentrale-oep-oer',
    );
  });

  it('extrahiert dtag aus der Hugo-URL-Form ohne Trailing-Slash', () => {
    expect(parseLegacyUrl('/2024/01/26/offenheit-das-wesentliche.html')).toBe(
      'offenheit-das-wesentliche',
    );
  });

  it('returned null für die kanonische kurze Form', () => {
    expect(parseLegacyUrl('/dezentrale-oep-oer/')).toBeNull();
  });

  it('returned null für leeren Pfad', () => {
    expect(parseLegacyUrl('/')).toBeNull();
  });

  it('returned null für andere Strukturen', () => {
    expect(parseLegacyUrl('/tag/OER/')).toBeNull();
    expect(parseLegacyUrl('/some/random/path/')).toBeNull();
  });

  it('decodiert percent-encoded dtags', () => {
    expect(parseLegacyUrl('/2024/05/12/mit%20leerzeichen.html/')).toBe(
      'mit leerzeichen',
    );
  });

  it('gibt null zurück bei malformed percent-encoding (crash-sicher)', () => {
    expect(parseLegacyUrl('/2024/01/26/%E0.html/')).toBeNull();
  });

  it('gibt null zurück für leeren dtag', () => {
    expect(parseLegacyUrl('/2024/01/26/.html/')).toBeNull();
  });
});

describe('canonicalPostPath', () => {
  it('erzeugt /<dtag>/ mit encodeURIComponent', () => {
    expect(canonicalPostPath('dezentrale-oep-oer')).toBe('/dezentrale-oep-oer/');
  });

  it('kodiert Sonderzeichen', () => {
    expect(canonicalPostPath('mit leerzeichen')).toBe('/mit%20leerzeichen/');
  });
});

describe('round-trip parseLegacyUrl → canonicalPostPath', () => {
  it('Legacy-URL wird zur kanonischen kurzen Form', () => {
    const dtag = parseLegacyUrl('/2025/03/04/dezentrale-oep-oer.html/');
    expect(dtag).not.toBeNull();
    expect(canonicalPostPath(dtag!)).toBe('/dezentrale-oep-oer/');
  });
});
