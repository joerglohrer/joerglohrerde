# SvelteKit-SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine produktive SvelteKit-SPA bauen, die Jörgs Nostr-Posts (`kind:30023`) live von Public-Relays rendert, auf `svelte.joerg-lohrer.de` deployed wird und später `joerg-lohrer.de` ablösen soll.

**Architecture:** SvelteKit mit `adapter-static` (SSR aus, Fallback `index.html`), `applesauce-relay` + `applesauce-loaders` + `applesauce-signers` für Nostr, `marked` + `DOMPurify` + `highlight.js` für Markdown. Konfiguration zur Laufzeit aus `kind:10002` (Relays) und `kind:10063` (Blossom). Legacy-URLs werden via `history.replaceState` auf kanonische kurze Form normalisiert.

**Tech Stack:** SvelteKit 2.x · Svelte 5 · TypeScript · Vite · `applesauce-relay` · `applesauce-loaders` · `applesauce-signers` · `nostr-tools` (nip19 Encoding) · `marked` · `DOMPurify` · `highlight.js` · Vitest · Playwright · `adapter-static`

**Scope:** Diese Implementation deckt die vollständige SPA-Spec ab — Home mit Liste + Profil, Einzelpost, Tag-Filter, Reactions und NIP-07-Kommentare. Die Publish-Pipeline (Markdown → Events) ist nicht Teil dieses Plans — sie hat eine eigene Spec und einen separaten Plan.

**Ausführungsort:** Branch `spa`, Unterordner `app/` des Repos.

---

## Referenzen

- **Spec SPA:** [`docs/superpowers/specs/2026-04-15-nostr-page-design.md`](../specs/2026-04-15-nostr-page-design.md)
- **Spec Publish-Pipeline:** [`docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`](../specs/2026-04-15-publish-pipeline-design.md)
- **Mini-Spike als funktionierendes Referenz-Verhalten:** [`preview/spa-mini/index.html`](../../../preview/spa-mini/index.html) — live unter `https://spa.joerg-lohrer.de/`
- **Autoren-Pubkey (npub):** `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
- **Autoren-Pubkey (hex):** `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`
- **Bootstrap-Relay:** `wss://relay.damus.io`
- **Beispiel-Event zum Testen:** `kind:30023`, `d:dezentrale-oep-oer` (existiert bereits auf allen 5 Relays)

---

## File-Structure

```
app/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── .gitignore
├── README.md
├── static/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── app.html                              # HTML-Shell, <head>-Defaults
│   ├── app.d.ts                              # TypeScript-Ambient-Deklarationen
│   ├── hooks.client.ts                       # Globaler Client-Hook (Fehler-Reporting)
│   ├── lib/
│   │   ├── nostr/
│   │   │   ├── config.ts                     # BOOTSTRAP_RELAY, AUTHOR_PUBKEY_HEX, FALLBACK_READ_RELAYS
│   │   │   ├── pool.ts                       # RelayPool Singleton
│   │   │   ├── relays.ts                     # loadOutboxRelays (kind:10002)
│   │   │   ├── blossom.ts                    # loadBlossomServers (kind:10063) — read-only, für später
│   │   │   ├── loaders.ts                    # loadProfile, loadPostList, loadPost, loadReplies, loadReactions
│   │   │   ├── signer.ts                     # NIP-07-Wrapper
│   │   │   └── naddr.ts                      # nip19.naddrEncode Helper
│   │   ├── render/
│   │   │   └── markdown.ts                   # renderMarkdown(md: string): string
│   │   ├── url/
│   │   │   └── legacy.ts                     # parseLegacyUrl, canonicalPostPath
│   │   ├── stores/
│   │   │   └── readRelays.ts                 # derived Store: aktuelle Read-Relay-Liste
│   │   └── components/
│   │       ├── ProfileCard.svelte
│   │       ├── PostCard.svelte
│   │       ├── PostView.svelte
│   │       ├── TagChip.svelte
│   │       ├── ReplyList.svelte
│   │       ├── ReplyItem.svelte
│   │       ├── ReplyComposer.svelte
│   │       ├── Reactions.svelte
│   │       └── LoadingOrError.svelte
│   └── routes/
│       ├── +layout.svelte                    # Shell (Header nur auf /, Breadcrumb ansonsten)
│       ├── +layout.ts                        # export const prerender = false; ssr = false
│       ├── +page.svelte                      # Home: Profil + Beitragsliste
│       ├── +error.svelte                     # Fehlerseite
│       ├── [...slug]/+page.svelte            # Catch-all: Legacy-Check, dann Einzelpost
│       └── tag/
│           └── [name]/+page.svelte           # Tag-Filter
├── tests/
│   ├── unit/
│   │   ├── markdown.test.ts
│   │   ├── legacy-url.test.ts
│   │   ├── naddr.test.ts
│   │   └── loaders.test.ts                   # gegen Mock-Relay
│   └── e2e/
│       ├── home.test.ts
│       ├── post.test.ts
│       ├── legacy-redirect.test.ts
│       └── tag.test.ts
└── playwright.config.ts
```

---

## Phase 1 — Setup (Tasks 1–6)

### Task 1: SvelteKit-Projekt initialisieren

**Files:**
- Create: `app/package.json`
- Create: `app/svelte.config.js`
- Create: `app/vite.config.ts`
- Create: `app/tsconfig.json`
- Create: `app/.gitignore`
- Create: `app/src/app.html`
- Create: `app/src/app.d.ts`
- Create: `app/src/routes/+page.svelte`
- Create: `app/static/favicon.ico`
- Create: `app/static/robots.txt`

- [ ] **Step 1.1: Arbeitsverzeichnis vorbereiten und SvelteKit-Skeleton erzeugen**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
mkdir -p app
cd app
# Nicht-interaktiv: minimal TypeScript-Skeleton anlegen
npx --yes sv create . --template minimal --types ts --no-add-ons --install npm
```

Expected: Verzeichnis `app/` hat `package.json`, `svelte.config.js`, `vite.config.ts`, `src/`, `static/`, `node_modules/` installiert.

- [ ] **Step 1.2: `svelte.config.js` auf adapter-static umstellen**

Ersetze den Inhalt von `app/svelte.config.js` durch:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
```

- [ ] **Step 1.3: adapter-static als Dependency hinzufügen**

```sh
cd app
npm install --save-dev @sveltejs/adapter-static
```

Expected: `package.json` hat `"@sveltejs/adapter-static"` in `devDependencies`.

- [ ] **Step 1.4: Globales SSR deaktivieren via `+layout.ts`**

Create `app/src/routes/+layout.ts`:

```ts
export const prerender = false;
export const ssr = false;
export const trailingSlash = 'always';
```

- [ ] **Step 1.5: Minimale `+page.svelte` für erste Build-Verifikation**

Ersetze Inhalt von `app/src/routes/+page.svelte` durch:

```svelte
<h1>SvelteKit-SPA bootet</h1>
<p>Wird Stück für Stück mit Nostr-Funktionalität gefüllt.</p>
```

- [ ] **Step 1.6: Build testen**

```sh
cd app
npm run build
```

Expected: `build/index.html` existiert, keine Fehler.

- [ ] **Step 1.7: `app/.gitignore` setzen**

Create oder überschreibe `app/.gitignore`:

```
node_modules/
build/
.svelte-kit/
package-lock.json
.env
.env.local
*.log
```

Hinweis: `package-lock.json` wird bewusst nicht committed, weil die Repo-weite Policy das so handhabt. Wenn die Policy später ändert, diese Zeile entfernen.

- [ ] **Step 1.8: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/
git commit -m "spa: sveltekit-skeleton mit adapter-static initialisiert"
```

---

### Task 2: Dependencies installieren und Aliases konfigurieren

**Files:**
- Modify: `app/package.json`
- Modify: `app/tsconfig.json`

- [ ] **Step 2.1: Runtime-Dependencies installieren**

```sh
cd app
npm install \
  applesauce-core \
  applesauce-relay \
  applesauce-loaders \
  applesauce-signers \
  nostr-tools \
  marked \
  dompurify \
  highlight.js \
  rxjs
```

- [ ] **Step 2.2: Dev-Dependencies installieren (Tests)**

```sh
cd app
npm install --save-dev vitest @playwright/test @testing-library/svelte jsdom
```

- [ ] **Step 2.3: Type-Definitionen für DOMPurify**

```sh
cd app
npm install --save-dev @types/dompurify
```

- [ ] **Step 2.4: Vitest-Konfiguration erweitern in `vite.config.ts`**

Ersetze Inhalt von `app/vite.config.ts` durch:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 2.5: npm-Scripts ergänzen in `package.json`**

Öffne `app/package.json`, ergänze im `"scripts"`-Objekt:

```json
"test:unit": "vitest run",
"test:e2e": "playwright test",
"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
"deploy:svelte": "../scripts/deploy-svelte.sh"
```

(Die `build`, `preview`, `dev` Scripts erzeugt SvelteKit initial — nur ergänzen.)

- [ ] **Step 2.6: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/
git commit -m "spa: runtime- und dev-dependencies installiert"
```

---

### Task 3: Konfigurations-Modul `config.ts`

**Files:**
- Create: `app/src/lib/nostr/config.ts`

- [ ] **Step 3.1: Config-Konstanten anlegen**

Create `app/src/lib/nostr/config.ts`:

```ts
/**
 * Nostr-Konfiguration der SPA.
 *
 * Wichtig: Der AUTHOR_PUBKEY_HEX muss synchron zum tatsächlichen
 * Autorenkonto sein (siehe docs/superpowers/specs/2026-04-15-nostr-page-design.md).
 */

/** npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9 in hex */
export const AUTHOR_PUBKEY_HEX =
  '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41';

/** Bootstrap-Relay für das initiale Lesen von kind:10002 */
export const BOOTSTRAP_RELAY = 'wss://relay.damus.io';

/** Fallback, falls kind:10002 nicht geladen werden kann */
export const FALLBACK_READ_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
];

/** Habla.news-Deep-Link-Basis (für Nutzer ohne JS oder wenn Events fehlen) */
export const HABLA_BASE = 'https://habla.news/a/';

/** Timeout-Werte in ms */
export const RELAY_TIMEOUT_MS = 8000;
export const RELAY_HARD_TIMEOUT_MS = 15000;
```

- [ ] **Step 3.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/config.ts
git commit -m "spa: nostr-konfigurations-modul mit pubkey, bootstrap-relay, fallbacks"
```

---

### Task 4: URL-Parsing-Modul mit TDD

**Files:**
- Create: `app/src/lib/url/legacy.ts`
- Create: `app/tests/unit/legacy-url.test.ts`

- [ ] **Step 4.1: Failing test für `parseLegacyUrl`**

Create `app/tests/unit/legacy-url.test.ts`:

```ts
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
});

describe('canonicalPostPath', () => {
  it('erzeugt /<dtag>/ mit encodeURIComponent', () => {
    expect(canonicalPostPath('dezentrale-oep-oer')).toBe('/dezentrale-oep-oer/');
  });

  it('kodiert Sonderzeichen', () => {
    expect(canonicalPostPath('mit leerzeichen')).toBe('/mit%20leerzeichen/');
  });
});
```

- [ ] **Step 4.2: Test ausführen, erwarte FAIL**

```sh
cd app
npm run test:unit -- legacy-url
```

Expected: Import-Fehler, weil `$lib/url/legacy` nicht existiert.

- [ ] **Step 4.3: Implementation**

Create `app/src/lib/url/legacy.ts`:

```ts
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
```

- [ ] **Step 4.4: Test ausführen, erwarte PASS**

```sh
cd app
npm run test:unit -- legacy-url
```

Expected: alle 8 Tests grün.

- [ ] **Step 4.5: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/url/legacy.ts app/tests/unit/legacy-url.test.ts
git commit -m "spa: url-parser für legacy-hugo-urls (tdd)"
```

---

### Task 5: naddr-Encoder-Modul mit TDD

**Files:**
- Create: `app/src/lib/nostr/naddr.ts`
- Create: `app/tests/unit/naddr.test.ts`

- [ ] **Step 5.1: Failing test**

Create `app/tests/unit/naddr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildHablaLink } from '$lib/nostr/naddr';

describe('buildHablaLink', () => {
  it('erzeugt einen habla.news/a/-Link mit naddr1-Bech32', () => {
    const link = buildHablaLink({
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      identifier: 'dezentrale-oep-oer',
      relays: ['wss://relay.damus.io'],
    });
    expect(link).toMatch(/^https:\/\/habla\.news\/a\/naddr1[a-z0-9]+$/);
  });

  it('ist deterministisch für gleiche Inputs', () => {
    const args = {
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      identifier: 'foo',
      relays: ['wss://relay.damus.io'],
    };
    expect(buildHablaLink(args)).toBe(buildHablaLink(args));
  });
});
```

- [ ] **Step 5.2: Test ausführen (FAIL)**

```sh
cd app
npm run test:unit -- naddr
```

- [ ] **Step 5.3: Implementation**

Create `app/src/lib/nostr/naddr.ts`:

```ts
import { nip19 } from 'nostr-tools';
import { HABLA_BASE } from './config';

export interface NaddrArgs {
  pubkey: string;
  kind: number;
  identifier: string;
  relays?: string[];
}

export function buildNaddr(args: NaddrArgs): string {
  return nip19.naddrEncode({
    pubkey: args.pubkey,
    kind: args.kind,
    identifier: args.identifier,
    relays: args.relays ?? [],
  });
}

export function buildHablaLink(args: NaddrArgs): string {
  return `${HABLA_BASE}${buildNaddr(args)}`;
}
```

- [ ] **Step 5.4: Test ausführen (PASS)**

```sh
cd app
npm run test:unit -- naddr
```

- [ ] **Step 5.5: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/naddr.ts app/tests/unit/naddr.test.ts
git commit -m "spa: naddr/habla-link-helper (tdd)"
```

---

### Task 6: Deploy-Script für svelte.joerg-lohrer.de

**Files:**
- Create: `scripts/deploy-svelte.sh`
- Create: `scripts/README.md`

- [ ] **Step 6.1: Deploy-Script anlegen**

Create `scripts/deploy-svelte.sh`:

```bash
#!/usr/bin/env bash
# Deploy: SvelteKit-Build nach svelte.joerg-lohrer.de per FTPS.
# Credentials kommen aus ./.env.local (gitignored), Variablen-Prefix SVELTE_FTP_.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "FEHLER: .env.local fehlt — Credentials ergänzen (siehe .env.example)." >&2
  exit 1
fi

# nur SVELTE_FTP_* exportieren
set -a
# shellcheck disable=SC1090
. <(grep -E '^SVELTE_FTP_' .env.local)
set +a

for v in SVELTE_FTP_HOST SVELTE_FTP_USER SVELTE_FTP_PASS SVELTE_FTP_REMOTE_PATH; do
  if [ -z "${!v:-}" ]; then
    echo "FEHLER: $v fehlt in .env.local." >&2
    exit 1
  fi
done

BUILD_DIR="$ROOT/app/build"
if [ ! -d "$BUILD_DIR" ]; then
  echo "FEHLER: app/build nicht vorhanden. Bitte vorher 'npm run build' in app/ ausführen." >&2
  exit 1
fi

echo "Lade Build von $BUILD_DIR nach ftp://$SVELTE_FTP_HOST$SVELTE_FTP_REMOTE_PATH"

# pro Datei ein curl-Upload (zuverlässig auf macOS ohne lftp)
find "$BUILD_DIR" -type f -print0 | while IFS= read -r -d '' local_file; do
  rel="${local_file#$BUILD_DIR/}"
  remote="ftp://$SVELTE_FTP_HOST${SVELTE_FTP_REMOTE_PATH%/}/$rel"
  echo "  → $rel"
  curl -sSf --ssl-reqd --ftp-create-dirs \
    --user "$SVELTE_FTP_USER:$SVELTE_FTP_PASS" \
    -T "$local_file" "$remote"
done

echo "Upload fertig. Live-Check:"
curl -sIL "https://svelte.joerg-lohrer.de/" | head -5
```

- [ ] **Step 6.2: Script ausführbar machen**

```sh
chmod +x scripts/deploy-svelte.sh
```

- [ ] **Step 6.3: Scripts-README anlegen**

Create `scripts/README.md`:

```markdown
# Scripts

- **`deploy-svelte.sh`** — deployed den SvelteKit-Build aus `app/build/` nach
  `svelte.joerg-lohrer.de` via FTPS. Benötigt `.env.local` im Repo-Root mit
  den Variablen `SVELTE_FTP_HOST`, `SVELTE_FTP_USER`, `SVELTE_FTP_PASS`,
  `SVELTE_FTP_REMOTE_PATH`. Aufruf:

  ```sh
  cd app && npm run build && cd .. && ./scripts/deploy-svelte.sh
  ```
```

- [ ] **Step 6.4: Test-Deploy mit dem Minimal-Build aus Task 1**

Voraussetzung: `SVELTE_FTP_*` in `.env.local` ist ausgefüllt und `svelte.joerg-lohrer.de` hat SSL aktiv.

```sh
cd app && npm run build && cd ..
./scripts/deploy-svelte.sh
```

Expected: Upload läuft durch, `curl -sI https://svelte.joerg-lohrer.de/` liefert HTTP 200 und Inhalt zeigt „SvelteKit-SPA bootet".

- [ ] **Step 6.5: `.htaccess` für SPA-Fallback anlegen (analog zu Mini-Spike)**

Create `app/static/.htaccess`:

```apache
RewriteEngine On

# HTTPS forcieren
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Existierende Datei oder Verzeichnis? Direkt ausliefern.
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Alles andere → SPA-Fallback (SvelteKit mit adapter-static)
RewriteRule ^ /index.html [L]
```

Rebuild und redeploy:

```sh
cd app && npm run build && cd ..
./scripts/deploy-svelte.sh
```

- [ ] **Step 6.6: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add scripts/ app/static/.htaccess
git commit -m "spa: deploy-script und htaccess für svelte.joerg-lohrer.de"
```

---

## Phase 2 — Datenebene (Tasks 7–14)

### Task 7: Markdown-Renderer mit TDD

**Files:**
- Create: `app/src/lib/render/markdown.ts`
- Create: `app/tests/unit/markdown.test.ts`

- [ ] **Step 7.1: Failing test**

Create `app/tests/unit/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '$lib/render/markdown';

describe('renderMarkdown', () => {
  it('rendert einfachen Markdown-Text zu HTML', () => {
    const html = renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('entfernt <script>-Tags (DOMPurify)', () => {
    const html = renderMarkdown('hello <script>alert("x")</script> world');
    expect(html).not.toContain('<script>');
  });

  it('entfernt javascript:-URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toMatch(/javascript:/i);
  });

  it('rendert Links mit http:// und erhält das href', () => {
    const html = renderMarkdown('[nostr](https://nostr.com)');
    expect(html).toContain('href="https://nostr.com"');
  });

  it('rendert horizontale Linie aus ---', () => {
    const html = renderMarkdown('oben\n\n---\n\nunten');
    expect(html).toContain('<hr>');
  });

  it('rendert fenced code blocks', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
  });

  it('rendert GFM tables', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table');
    expect(html).toContain('<td>1</td>');
  });

  it('rendert Bilder', () => {
    const html = renderMarkdown('![alt](https://example.com/img.png)');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/img.png"');
  });
});
```

- [ ] **Step 7.2: Test ausführen (FAIL)**

```sh
cd app
npm run test:unit -- markdown
```

- [ ] **Step 7.3: Implementation**

Create `app/src/lib/render/markdown.ts`:

```ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : undefined;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const cls = language ? ` language-${language}` : '';
      return `<pre><code class="hljs${cls}">${highlighted}</code></pre>`;
    },
  },
});

/**
 * Rendert einen Markdown-String zu sanitized HTML.
 * Einziger Export des Moduls — so bleibt Austausch der Engine lokal.
 */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel'],
  });
}
```

- [ ] **Step 7.4: Test ausführen (PASS)**

```sh
cd app
npm run test:unit -- markdown
```

Expected: alle 8 Tests grün.

- [ ] **Step 7.5: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/render/markdown.ts app/tests/unit/markdown.test.ts
git commit -m "spa: markdown-renderer mit sanitize (tdd)"
```

---

### Task 8: RelayPool-Singleton

**Files:**
- Create: `app/src/lib/nostr/pool.ts`

- [ ] **Step 8.1: RelayPool anlegen**

Create `app/src/lib/nostr/pool.ts`:

```ts
import { RelayPool } from 'applesauce-relay';

/**
 * Singleton-Pool für alle Nostr-Requests der SPA.
 * applesauce-relay verwaltet Reconnects, Subscriptions, deduping intern.
 */
export const pool = new RelayPool();
```

- [ ] **Step 8.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/pool.ts
git commit -m "spa: relaypool-singleton via applesauce-relay"
```

---

### Task 9: Outbox-Relays laden (`kind:10002`)

**Files:**
- Create: `app/src/lib/nostr/relays.ts`

- [ ] **Step 9.1: Helper anlegen**

Create `app/src/lib/nostr/relays.ts`:

```ts
import { pool } from './pool';
import {
  AUTHOR_PUBKEY_HEX,
  BOOTSTRAP_RELAY,
  FALLBACK_READ_RELAYS,
  RELAY_TIMEOUT_MS,
} from './config';

export interface OutboxRelay {
  url: string;
  /** true = zum Lesen zu nutzen (kein dritter Tag-Wert oder "read") */
  read: boolean;
  /** true = zum Schreiben zu nutzen (kein dritter Tag-Wert oder "write") */
  write: boolean;
}

/**
 * Lädt die NIP-65-Relay-Liste (kind:10002) des Autors vom Bootstrap-Relay.
 * Fallback auf FALLBACK_READ_RELAYS, wenn das Event nicht innerhalb von
 * RELAY_TIMEOUT_MS gefunden wird.
 *
 * Interpretation des dritten Tag-Werts:
 * - nicht gesetzt → read + write
 * - "read" → nur read
 * - "write" → nur write
 */
export async function loadOutboxRelays(): Promise<OutboxRelay[]> {
  const event = await Promise.race([
    firstEvent({ kinds: [10002], authors: [AUTHOR_PUBKEY_HEX], limit: 1 }),
    timeout(RELAY_TIMEOUT_MS),
  ]).catch(() => null);

  if (!event) {
    return FALLBACK_READ_RELAYS.map((url) => ({ url, read: true, write: true }));
  }

  const relays: OutboxRelay[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'r' || !tag[1]) continue;
    const mode = tag[2];
    relays.push({
      url: tag[1],
      read: mode !== 'write',
      write: mode !== 'read',
    });
  }

  if (relays.length === 0) {
    return FALLBACK_READ_RELAYS.map((url) => ({ url, read: true, write: true }));
  }

  return relays;
}

/** Nur die Read-URLs aus OutboxRelay[] */
export function readUrls(relays: OutboxRelay[]): string[] {
  return relays.filter((r) => r.read).map((r) => r.url);
}

/** Nur die Write-URLs aus OutboxRelay[] */
export function writeUrls(relays: OutboxRelay[]): string[] {
  return relays.filter((r) => r.write).map((r) => r.url);
}

// ---------- Internes --------------------------------------------------------

interface NostrEventShape {
  tags: string[][];
  [k: string]: unknown;
}

function firstEvent(filter: {
  kinds: number[];
  authors?: string[];
  limit?: number;
}): Promise<NostrEventShape | null> {
  return new Promise((resolve) => {
    let done = false;
    const sub = pool.subscription([BOOTSTRAP_RELAY], filter).subscribe({
      next(msg) {
        if (done) return;
        // applesauce-relay liefert Tupel ["EVENT", ..., event] / ["EOSE"] etc.
        if (Array.isArray(msg) && msg[0] === 'EVENT') {
          done = true;
          sub.unsubscribe();
          resolve(msg[2] as NostrEventShape);
        } else if (Array.isArray(msg) && msg[0] === 'EOSE') {
          if (!done) {
            done = true;
            sub.unsubscribe();
            resolve(null);
          }
        }
      },
      error() {
        if (!done) {
          done = true;
          resolve(null);
        }
      },
      complete() {
        if (!done) {
          done = true;
          resolve(null);
        }
      },
    });
  });
}

function timeout(ms: number): Promise<null> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}
```

- [ ] **Step 9.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/relays.ts
git commit -m "spa: outbox-relay-loader für kind:10002 mit fallback"
```

---

### Task 10: Read-Relays-Store

**Files:**
- Create: `app/src/lib/stores/readRelays.ts`

- [ ] **Step 10.1: Store anlegen**

Create `app/src/lib/stores/readRelays.ts`:

```ts
import { writable, type Readable } from 'svelte/store';
import { loadOutboxRelays, readUrls } from '$lib/nostr/relays';
import { FALLBACK_READ_RELAYS } from '$lib/nostr/config';

/**
 * Store mit der aktuellen Read-Relay-Liste.
 * Initial = FALLBACK_READ_RELAYS, damit die SPA sofort abfragen kann;
 * sobald loadOutboxRelays() fertig ist, wird der Store aktualisiert.
 *
 * Singleton-Initialisierung: bootstrap() wird genau einmal beim ersten
 * Import aufgerufen.
 */
const store = writable<string[]>([...FALLBACK_READ_RELAYS]);
let bootstrapped = false;

export function bootstrapReadRelays(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  loadOutboxRelays()
    .then((relays) => {
      const urls = readUrls(relays);
      if (urls.length > 0) store.set(urls);
    })
    .catch(() => {
      // Store behält seinen initialen FALLBACK-Zustand
    });
}

export const readRelays: Readable<string[]> = store;
```

- [ ] **Step 10.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/stores/readRelays.ts
git commit -m "spa: read-relays-store mit bootstrap aus kind:10002"
```

---

### Task 11: Loader-Modul — Post-Liste und Einzelpost

**Files:**
- Create: `app/src/lib/nostr/loaders.ts`

- [ ] **Step 11.1: Loader-API definieren**

Create `app/src/lib/nostr/loaders.ts`:

```ts
import { get } from 'svelte/store';
import { pool } from './pool';
import { readRelays } from '$lib/stores/readRelays';
import { AUTHOR_PUBKEY_HEX, RELAY_HARD_TIMEOUT_MS } from './config';

/** Minimales Event-Interface für unsere Zwecke */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** Profile-Content (kind:0) */
export interface Profile {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
}

/**
 * Startet eine Subscription und liefert alle gesammelten Events,
 * sobald EOSE empfangen wird ODER hard-Timeout eintritt.
 */
function collectEvents(
  relays: string[],
  filter: { kinds: number[]; authors?: string[]; '#d'?: string[]; '#a'?: string[]; '#e'?: string[]; limit?: number },
  opts?: { onEvent?: (ev: NostrEvent) => void; hardTimeoutMs?: number },
): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const collected: NostrEvent[] = [];
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      sub.unsubscribe();
      resolve(collected);
    };

    const sub = pool.subscription(relays, filter).subscribe({
      next(msg) {
        if (done) return;
        if (Array.isArray(msg) && msg[0] === 'EVENT') {
          const ev = msg[2] as NostrEvent;
          collected.push(ev);
          opts?.onEvent?.(ev);
        } else if (Array.isArray(msg) && msg[0] === 'EOSE') {
          finish();
        }
      },
      error: finish,
      complete: finish,
    });

    setTimeout(finish, opts?.hardTimeoutMs ?? RELAY_HARD_TIMEOUT_MS);
  });
}

/** Dedup per d-Tag: neueste (created_at) wins */
function dedupByDtag(events: NostrEvent[]): NostrEvent[] {
  const byDtag = new Map<string, NostrEvent>();
  for (const ev of events) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1];
    if (!d) continue;
    const existing = byDtag.get(d);
    if (!existing || ev.created_at > existing.created_at) {
      byDtag.set(d, ev);
    }
  }
  return [...byDtag.values()];
}

/** Alle kind:30023-Posts des Autors, neueste zuerst */
export async function loadPostList(
  onEvent?: (ev: NostrEvent) => void,
): Promise<NostrEvent[]> {
  const relays = get(readRelays);
  const events = await collectEvents(
    relays,
    { kinds: [30023], authors: [AUTHOR_PUBKEY_HEX], limit: 200 },
    { onEvent },
  );
  const deduped = dedupByDtag(events);
  return deduped.sort((a, b) => {
    const ap = parseInt(a.tags.find((t) => t[0] === 'published_at')?.[1] ?? `${a.created_at}`, 10);
    const bp = parseInt(b.tags.find((t) => t[0] === 'published_at')?.[1] ?? `${b.created_at}`, 10);
    return bp - ap;
  });
}

/** Einzelpost per d-Tag */
export async function loadPost(dtag: string): Promise<NostrEvent | null> {
  const relays = get(readRelays);
  const events = await collectEvents(relays, {
    kinds: [30023],
    authors: [AUTHOR_PUBKEY_HEX],
    '#d': [dtag],
    limit: 1,
  });
  if (events.length === 0) return null;
  return events.reduce((best, cur) => (cur.created_at > best.created_at ? cur : best));
}

/** Profil-Event kind:0 (neueste Version) */
export async function loadProfile(): Promise<Profile | null> {
  const relays = get(readRelays);
  const events = await collectEvents(relays, {
    kinds: [0],
    authors: [AUTHOR_PUBKEY_HEX],
    limit: 1,
  });
  if (events.length === 0) return null;
  const latest = events.reduce((best, cur) =>
    cur.created_at > best.created_at ? cur : best,
  );
  try {
    return JSON.parse(latest.content) as Profile;
  } catch {
    return null;
  }
}
```

- [ ] **Step 11.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/loaders.ts
git commit -m "spa: loader für postlist, post, profile"
```

---

### Task 12: Replies-Loader (`kind:1` mit `#a`-Tag auf Post-Adresse)

**Files:**
- Modify: `app/src/lib/nostr/loaders.ts` (ergänzen)

- [ ] **Step 12.1: `loadReplies` hinzufügen**

Am Ende von `app/src/lib/nostr/loaders.ts` anhängen:

```ts
/** Post-Adresse im `a`-Tag-Format: "30023:<pubkey>:<dtag>" */
function eventAddress(pubkey: string, dtag: string): string {
  return `30023:${pubkey}:${dtag}`;
}

/**
 * Alle kind:1-Replies auf einen Post, chronologisch aufsteigend (älteste zuerst).
 * Streamt via onEvent, wenn angegeben.
 */
export async function loadReplies(
  dtag: string,
  onEvent?: (ev: NostrEvent) => void,
): Promise<NostrEvent[]> {
  const relays = get(readRelays);
  const address = eventAddress(AUTHOR_PUBKEY_HEX, dtag);
  const events = await collectEvents(
    relays,
    { kinds: [1], '#a': [address], limit: 500 },
    { onEvent },
  );
  return events.sort((a, b) => a.created_at - b.created_at);
}
```

- [ ] **Step 12.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/loaders.ts
git commit -m "spa: replies-loader für kind:1 mit a-tag-filter"
```

---

### Task 13: Reactions-Loader (`kind:7`)

**Files:**
- Modify: `app/src/lib/nostr/loaders.ts` (ergänzen)

- [ ] **Step 13.1: `loadReactions` hinzufügen**

Am Ende von `app/src/lib/nostr/loaders.ts` anhängen:

```ts
export interface ReactionSummary {
  /** Emoji oder "+"/"-" */
  content: string;
  count: number;
}

/**
 * Aggregiert kind:7-Reactions auf einen Post.
 * Gruppiert nach content, zählt Anzahl.
 */
export async function loadReactions(dtag: string): Promise<ReactionSummary[]> {
  const relays = get(readRelays);
  const address = eventAddress(AUTHOR_PUBKEY_HEX, dtag);
  const events = await collectEvents(relays, {
    kinds: [7],
    '#a': [address],
    limit: 500,
  });
  const counts = new Map<string, number>();
  for (const ev of events) {
    const key = ev.content || '+';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([content, count]) => ({ content, count }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 13.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/loaders.ts
git commit -m "spa: reactions-loader mit aggregation"
```

---

### Task 14: NIP-07-Signer-Wrapper

**Files:**
- Create: `app/src/lib/nostr/signer.ts`

- [ ] **Step 14.1: Signer-Wrapper anlegen**

Create `app/src/lib/nostr/signer.ts`:

```ts
/**
 * NIP-07-Wrapper für Browser-Extension-Signer (Alby, nos2x, Flamingo).
 *
 * window.nostr ist optional — wenn die Extension fehlt, liefern wir null zurück
 * und der Aufrufer zeigt einen Hinweis an.
 */

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: UnsignedEvent): Promise<SignedEvent>;
    };
  }
}

export interface UnsignedEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

export interface SignedEvent extends UnsignedEvent {
  id: string;
  sig: string;
}

export function hasNip07(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

export async function getPublicKey(): Promise<string | null> {
  if (!hasNip07()) return null;
  try {
    return await window.nostr!.getPublicKey();
  } catch {
    return null;
  }
}

export async function signEvent(event: UnsignedEvent): Promise<SignedEvent | null> {
  if (!hasNip07()) return null;
  try {
    return await window.nostr!.signEvent(event);
  } catch {
    return null;
  }
}
```

- [ ] **Step 14.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/signer.ts
git commit -m "spa: nip-07-signer-wrapper"
```

---

## Phase 3 — Routing & Pages (Tasks 15–22)

### Task 15: Gemeinsame Komponente `LoadingOrError.svelte`

**Files:**
- Create: `app/src/lib/components/LoadingOrError.svelte`

- [ ] **Step 15.1: Komponente anlegen**

Create `app/src/lib/components/LoadingOrError.svelte`:

```svelte
<script lang="ts">
  interface Props {
    loading: boolean;
    error: string | null;
    hablaLink?: string;
  }
  let { loading, error, hablaLink }: Props = $props();
</script>

{#if loading && !error}
  <p class="status">Lade von Nostr-Relays …</p>
{:else if error}
  <p class="status status-error">
    {error}
    {#if hablaLink}
      <br />
      <a href={hablaLink} target="_blank" rel="noopener">
        In Habla.news öffnen
      </a>
    {/if}
  </p>
{/if}

<style>
  .status {
    padding: 1rem;
    border-radius: 4px;
    background: var(--code-bg);
    color: var(--muted);
    text-align: center;
  }
  .status-error {
    background: #fee2e2;
    color: #991b1b;
  }
  @media (prefers-color-scheme: dark) {
    .status-error {
      background: #450a0a;
      color: #fca5a5;
    }
  }
</style>
```

- [ ] **Step 15.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/LoadingOrError.svelte
git commit -m "spa: loading-or-error-komponente"
```

---

### Task 16: Globales Styling im `app.html`

**Files:**
- Modify: `app/src/app.html`

- [ ] **Step 16.1: app.html mit CSS-Variablen und Base-Layout**

Ersetze Inhalt von `app/src/app.html` durch:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="%sveltekit.assets%/favicon.ico" />
    <meta name="description" content="Jörg Lohrer – Blog (Nostr-basiert)" />
    <title>Jörg Lohrer</title>
    <style>
      :root {
        --fg: #1f2937;
        --muted: #6b7280;
        --bg: #fafaf9;
        --accent: #2563eb;
        --code-bg: #f3f4f6;
        --border: #e5e7eb;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --fg: #e5e7eb;
          --muted: #9ca3af;
          --bg: #18181b;
          --accent: #60a5fa;
          --code-bg: #27272a;
          --border: #3f3f46;
        }
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: var(--fg);
        background: var(--bg);
      }
      a { color: var(--accent); }
    </style>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 16.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/app.html
git commit -m "spa: globales styling mit css-variablen im app.html"
```

---

### Task 17: `+layout.svelte` mit Container und Bootstrap

**Files:**
- Create: `app/src/routes/+layout.svelte`

- [ ] **Step 17.1: Layout-Komponente mit Relay-Bootstrap**

Create `app/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { bootstrapReadRelays } from '$lib/stores/readRelays';

  let { children } = $props();

  onMount(() => {
    bootstrapReadRelays();
  });
</script>

<main>
  {@render children()}
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }
  @media (min-width: 640px) {
    main {
      padding: 1.5rem;
    }
  }
</style>
```

- [ ] **Step 17.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/routes/+layout.svelte
git commit -m "spa: layout mit container und relay-bootstrap"
```

---

### Task 18: `ProfileCard.svelte`

**Files:**
- Create: `app/src/lib/components/ProfileCard.svelte`

- [ ] **Step 18.1: Komponente anlegen**

Create `app/src/lib/components/ProfileCard.svelte`:

```svelte
<script lang="ts">
  import type { Profile } from '$lib/nostr/loaders';
  interface Props { profile: Profile | null }
  let { profile }: Props = $props();
</script>

{#if profile}
  <div class="profile">
    {#if profile.picture}
      <img class="avatar" src={profile.picture} alt={profile.display_name ?? profile.name ?? ''} />
    {:else}
      <div class="avatar"></div>
    {/if}
    <div class="info">
      <div class="name">{profile.display_name ?? profile.name ?? ''}</div>
      {#if profile.about}
        <div class="about">{profile.about}</div>
      {/if}
      {#if profile.nip05 || profile.website}
        <div class="meta-line">
          {#if profile.nip05}<span>{profile.nip05}</span>{/if}
          {#if profile.nip05 && profile.website}<span class="sep">·</span>{/if}
          {#if profile.website}
            <a href={profile.website} target="_blank" rel="noopener">
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .profile {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  .avatar {
    flex: 0 0 80px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--code-bg);
  }
  .info { flex: 1; min-width: 0; }
  .name { font-size: 1.3rem; font-weight: 600; margin: 0 0 0.2rem; }
  .about { color: var(--muted); font-size: 0.95rem; margin: 0 0 0.3rem; }
  .meta-line { font-size: 0.85rem; color: var(--muted); }
  .meta-line a { color: var(--accent); text-decoration: none; }
  .meta-line a:hover { text-decoration: underline; }
  .sep { margin: 0 0.4rem; opacity: 0.5; }
</style>
```

- [ ] **Step 18.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/ProfileCard.svelte
git commit -m "spa: profile-card komponente"
```

---

### Task 19: `PostCard.svelte` (Listenelement)

**Files:**
- Create: `app/src/lib/components/PostCard.svelte`

- [ ] **Step 19.1: Komponente anlegen**

Create `app/src/lib/components/PostCard.svelte`:

```svelte
<script lang="ts">
  import type { NostrEvent } from '$lib/nostr/loaders';
  import { canonicalPostPath } from '$lib/url/legacy';

  interface Props { event: NostrEvent }
  let { event }: Props = $props();

  function tagValue(e: NostrEvent, name: string): string {
    return e.tags.find((t) => t[0] === name)?.[1] ?? '';
  }

  const dtag = tagValue(event, 'd');
  const title = tagValue(event, 'title') || '(ohne Titel)';
  const summary = tagValue(event, 'summary');
  const image = tagValue(event, 'image');
  const publishedAt = parseInt(tagValue(event, 'published_at') || `${event.created_at}`, 10);
  const date = new Date(publishedAt * 1000).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const href = canonicalPostPath(dtag);
</script>

<a class="card" {href}>
  <div class="thumb" style:background-image={image ? `url('${image}')` : undefined} aria-hidden="true"></div>
  <div class="text">
    <div class="meta">{date}</div>
    <h2>{title}</h2>
    {#if summary}<p class="excerpt">{summary}</p>{/if}
  </div>
</a>

<style>
  .card {
    display: flex;
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
    color: inherit;
    text-decoration: none;
    align-items: flex-start;
  }
  .card:hover { background: var(--code-bg); }
  .thumb {
    flex: 0 0 120px;
    aspect-ratio: 1 / 1;
    border-radius: 4px;
    background: var(--code-bg) center/cover no-repeat;
  }
  .text { flex: 1; min-width: 0; }
  h2 { margin: 0 0 0.3rem; font-size: 1.2rem; color: var(--fg); word-wrap: break-word; }
  .excerpt { color: var(--muted); font-size: 0.95rem; margin: 0; }
  .meta { font-size: 0.85rem; color: var(--muted); margin-bottom: 0.2rem; }
  @media (max-width: 479px) {
    .card { flex-direction: column; gap: 0.5rem; }
    .thumb { flex: 0 0 auto; width: 100%; aspect-ratio: 2 / 1; }
  }
</style>
```

- [ ] **Step 19.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/PostCard.svelte
git commit -m "spa: post-card listenelement"
```

---

### Task 20: Home-Page `+page.svelte`

**Files:**
- Modify: `app/src/routes/+page.svelte`

- [ ] **Step 20.1: Home-Page mit Profil + Liste**

Ersetze Inhalt von `app/src/routes/+page.svelte` durch:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { NostrEvent, Profile } from '$lib/nostr/loaders';
  import { loadPostList, loadProfile } from '$lib/nostr/loaders';
  import ProfileCard from '$lib/components/ProfileCard.svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  import LoadingOrError from '$lib/components/LoadingOrError.svelte';

  let profile: Profile | null = $state(null);
  let posts: NostrEvent[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(async () => {
    try {
      const [p, list] = await Promise.all([loadProfile(), loadPostList()]);
      profile = p;
      posts = list;
      loading = false;
      if (list.length === 0) {
        error = 'Keine Posts gefunden auf den abgefragten Relays.';
      }
    } catch (e) {
      loading = false;
      error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    }
  });

  $effect(() => {
    const name = profile?.display_name ?? profile?.name ?? 'Jörg Lohrer';
    document.title = `${name} – Blog`;
  });
</script>

<ProfileCard {profile} />

<h1 class="list-title">Beiträge</h1>

<LoadingOrError {loading} {error} />

{#each posts as post (post.id)}
  <PostCard event={post} />
{/each}

<style>
  .list-title { margin: 0 0 1rem; font-size: 1.4rem; }
</style>
```

- [ ] **Step 20.2: Lokal testen**

```sh
cd app
npm run dev
```

Öffne `http://localhost:5173/`. Erwartung: Profilkachel oben, „Beiträge"-Überschrift, Liste der publizierten Posts mit Thumbnails.

- [ ] **Step 20.3: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/routes/+page.svelte
git commit -m "spa: home-page mit profil und beitragsliste"
```

---

### Task 21: `PostView.svelte` Komponente

**Files:**
- Create: `app/src/lib/components/PostView.svelte`

- [ ] **Step 21.1: Komponente anlegen**

Create `app/src/lib/components/PostView.svelte`:

```svelte
<script lang="ts">
  import type { NostrEvent } from '$lib/nostr/loaders';
  import { renderMarkdown } from '$lib/render/markdown';

  interface Props { event: NostrEvent }
  let { event }: Props = $props();

  function tagValue(e: NostrEvent, name: string): string {
    return e.tags.find((t) => t[0] === name)?.[1] ?? '';
  }
  function tagsAll(e: NostrEvent, name: string): string[] {
    return e.tags.filter((t) => t[0] === name).map((t) => t[1]);
  }

  const title = tagValue(event, 'title') || '(ohne Titel)';
  const summary = tagValue(event, 'summary');
  const image = tagValue(event, 'image');
  const publishedAt = parseInt(tagValue(event, 'published_at') || `${event.created_at}`, 10);
  const date = new Date(publishedAt * 1000).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const tags = tagsAll(event, 't');
  const bodyHtml = renderMarkdown(event.content);

  $effect(() => {
    document.title = `${title} – Jörg Lohrer`;
  });
</script>

<h1 class="post-title">{title}</h1>
<div class="meta">
  Veröffentlicht am {date}
  {#if tags.length > 0}
    <div class="tags">
      {#each tags as t}
        <a class="tag" href="/tag/{encodeURIComponent(t)}/">{t}</a>
      {/each}
    </div>
  {/if}
</div>

{#if image}
  <p class="cover"><img src={image} alt="Cover-Bild" /></p>
{/if}

{#if summary}
  <p class="summary">{summary}</p>
{/if}

<article>{@html bodyHtml}</article>

<style>
  .post-title {
    font-size: 1.5rem;
    line-height: 1.25;
    margin: 0 0 0.4rem;
    word-wrap: break-word;
  }
  @media (min-width: 640px) {
    .post-title { font-size: 2rem; line-height: 1.2; }
  }
  .meta { color: var(--muted); font-size: 0.92rem; margin-bottom: 2rem; }
  .tags { margin-top: 0.4rem; }
  .tag {
    display: inline-block;
    background: var(--code-bg);
    border-radius: 3px;
    padding: 1px 7px;
    margin: 0 4px 4px 0;
    font-size: 0.85em;
    color: var(--fg);
    text-decoration: none;
  }
  .tag:hover { background: var(--border); }
  .cover {
    max-width: 480px;
    margin: 1rem auto 1.5rem;
  }
  .cover img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 4px;
  }
  .summary { font-style: italic; color: var(--muted); }
  article :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  article :global(a) { color: var(--accent); word-break: break-word; }
  article :global(pre) {
    background: var(--code-bg);
    padding: 0.8rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.88em;
    max-width: 100%;
  }
  article :global(code) {
    background: var(--code-bg);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.92em;
    word-break: break-word;
  }
  article :global(pre code) { padding: 0; background: none; word-break: normal; }
  article :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
  }
  article :global(blockquote) {
    border-left: 3px solid var(--border);
    padding: 0 0 0 1rem;
    margin: 1rem 0;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 21.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/PostView.svelte
git commit -m "spa: post-view komponente mit markdown-rendering"
```

---

### Task 22: Catch-all-Route `[...slug]/+page.svelte` mit Legacy-Normalisierung

**Files:**
- Create: `app/src/routes/[...slug]/+page.svelte`
- Create: `app/src/routes/[...slug]/+page.ts`

- [ ] **Step 22.1: Route-Load-Funktion**

Create `app/src/routes/[...slug]/+page.ts`:

```ts
import { error, redirect } from '@sveltejs/kit';
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  const pathname = url.pathname;

  // Legacy-Form /YYYY/MM/DD/<dtag>.html/ → Redirect auf /<dtag>/
  const legacyDtag = parseLegacyUrl(pathname);
  if (legacyDtag) {
    throw redirect(301, canonicalPostPath(legacyDtag));
  }

  // Kanonisch: /<dtag>/ — erster Segment des Pfades.
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (segments.length !== 1 || !segments[0]) {
    throw error(404, 'Seite nicht gefunden');
  }

  return { dtag: decodeURIComponent(segments[0]) };
};
```

- [ ] **Step 22.2: PostView-Seite**

Create `app/src/routes/[...slug]/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { NostrEvent } from '$lib/nostr/loaders';
  import { loadPost } from '$lib/nostr/loaders';
  import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
  import { buildHablaLink } from '$lib/nostr/naddr';
  import PostView from '$lib/components/PostView.svelte';
  import LoadingOrError from '$lib/components/LoadingOrError.svelte';

  let { data } = $props();
  const dtag = data.dtag;

  let post: NostrEvent | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  const hablaLink = buildHablaLink({
    pubkey: AUTHOR_PUBKEY_HEX,
    kind: 30023,
    identifier: dtag,
  });

  onMount(async () => {
    try {
      const p = await loadPost(dtag);
      loading = false;
      if (!p) {
        error = `Post "${dtag}" nicht gefunden.`;
      } else {
        post = p;
      }
    } catch (e) {
      loading = false;
      error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    }
  });
</script>

<nav class="breadcrumb"><a href="/">← Zurück zur Übersicht</a></nav>

<LoadingOrError {loading} {error} {hablaLink} />

{#if post}
  <PostView event={post} />
{/if}

<style>
  .breadcrumb {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .breadcrumb a { color: var(--accent); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 22.3: Lokal testen**

```sh
cd app
npm run dev
```

Öffne `http://localhost:5173/dezentrale-oep-oer/`. Erwartung: Post rendert. Breadcrumb „← Zurück zur Übersicht" funktioniert. Teste auch `http://localhost:5173/2025/03/04/dezentrale-oep-oer.html/` — Browser sollte auf `/dezentrale-oep-oer/` umleiten und Post zeigen.

- [ ] **Step 22.4: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/routes/
git commit -m "spa: catch-all-route mit legacy-redirect und postview"
```

---

## Phase 4 — Tag-Navigation (Tasks 23–25)

### Task 23: Tag-Filter-Loader

**Files:**
- Modify: `app/src/lib/nostr/loaders.ts` (ergänzen)

- [ ] **Step 23.1: `loadPostsByTag` hinzufügen**

Am Ende von `app/src/lib/nostr/loaders.ts` anhängen:

```ts
/**
 * Filtert Post-Liste clientseitig nach Tag-Name.
 * (Relay-seitige #t-Filter werden nicht von allen Relays unterstützt — safer
 * ist es, die ganze Liste zu laden und lokal zu filtern.)
 */
export async function loadPostsByTag(tagName: string): Promise<NostrEvent[]> {
  const all = await loadPostList();
  const norm = tagName.toLowerCase();
  return all.filter((ev) =>
    ev.tags.some((t) => t[0] === 't' && t[1]?.toLowerCase() === norm),
  );
}
```

- [ ] **Step 23.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/nostr/loaders.ts
git commit -m "spa: tag-filter-loader (case-insensitive, client-side)"
```

---

### Task 24: Tag-Seite

**Files:**
- Create: `app/src/routes/tag/[name]/+page.ts`
- Create: `app/src/routes/tag/[name]/+page.svelte`

- [ ] **Step 24.1: Load-Funktion**

Create `app/src/routes/tag/[name]/+page.ts`:

```ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  return { tagName: decodeURIComponent(params.name) };
};
```

- [ ] **Step 24.2: Seite**

Create `app/src/routes/tag/[name]/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { NostrEvent } from '$lib/nostr/loaders';
  import { loadPostsByTag } from '$lib/nostr/loaders';
  import PostCard from '$lib/components/PostCard.svelte';
  import LoadingOrError from '$lib/components/LoadingOrError.svelte';

  let { data } = $props();
  const tagName = data.tagName;

  let posts: NostrEvent[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(async () => {
    try {
      posts = await loadPostsByTag(tagName);
      loading = false;
      if (posts.length === 0) {
        error = `Keine Posts mit Tag "${tagName}" gefunden.`;
      }
    } catch (e) {
      loading = false;
      error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    }
  });

  $effect(() => {
    document.title = `#${tagName} – Jörg Lohrer`;
  });
</script>

<nav class="breadcrumb"><a href="/">← Zurück zur Übersicht</a></nav>

<h1 class="tag-title">#{tagName}</h1>

<LoadingOrError {loading} {error} />

{#each posts as post (post.id)}
  <PostCard event={post} />
{/each}

<style>
  .breadcrumb { font-size: 0.9rem; margin-bottom: 1rem; }
  .breadcrumb a { color: var(--accent); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .tag-title { margin: 0 0 1.5rem; font-size: 1.6rem; }
</style>
```

- [ ] **Step 24.3: Lokal testen**

```sh
cd app
npm run dev
```

Öffne `http://localhost:5173/tag/OER/`. Erwartung: Liste aller Posts mit `t`-Tag „OER".

- [ ] **Step 24.4: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/routes/tag/
git commit -m "spa: tag-filter-seite"
```

---

### Task 25: Tag-Link-Sicherheit fixen

**Files:**
- Modify: `app/src/lib/components/PostView.svelte:63-65`

Hintergrund: in Task 21 wurde `href="/tag/{encodeURIComponent(t)}/"` schon gesetzt — sollte passen. Verifizieren.

- [ ] **Step 25.1: Verifizieren**

Öffne `http://localhost:5173/dezentrale-oep-oer/`. Klick auf Tag „OER". Erwartung: Navigation zu `/tag/OER/`, Liste wird gefiltert.

- [ ] **Step 25.2: Keine Änderung nötig, Verifikations-Step. Commit wird übersprungen, wenn nichts geändert wurde.**

---

## Phase 5 — Reactions & NIP-07-Kommentare (Tasks 26–32)

### Task 26: `Reactions.svelte`

**Files:**
- Create: `app/src/lib/components/Reactions.svelte`

- [ ] **Step 26.1: Komponente anlegen**

Create `app/src/lib/components/Reactions.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ReactionSummary } from '$lib/nostr/loaders';
  import { loadReactions } from '$lib/nostr/loaders';

  interface Props { dtag: string }
  let { dtag }: Props = $props();

  let reactions: ReactionSummary[] = $state([]);

  onMount(async () => {
    try {
      reactions = await loadReactions(dtag);
    } catch {
      reactions = [];
    }
  });

  function displayChar(c: string): string {
    if (c === '+' || c === '') return '👍';
    if (c === '-') return '👎';
    return c;
  }
</script>

{#if reactions.length > 0}
  <div class="reactions">
    {#each reactions as r}
      <span class="reaction">
        <span class="emoji">{displayChar(r.content)}</span>
        <span class="count">{r.count}</span>
      </span>
    {/each}
  </div>
{/if}

<style>
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.5rem 0;
  }
  .reaction {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    background: var(--code-bg);
    border-radius: 999px;
    font-size: 0.9rem;
  }
  .count { color: var(--muted); }
</style>
```

- [ ] **Step 26.2: In PostView einbinden**

Modify `app/src/lib/components/PostView.svelte` — am Anfang des `<script>`:

```ts
import Reactions from './Reactions.svelte';
```

Am Ende, vor dem schließenden `</style>`-Block (also im Markup-Bereich), nach `<article>{@html bodyHtml}</article>` ergänzen:

```svelte
{#if dtag}<Reactions {dtag} />{/if}
```

Und oben in den Variablen:

```ts
const dtag = tagValue(event, 'd');
```

- [ ] **Step 26.3: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/Reactions.svelte app/src/lib/components/PostView.svelte
git commit -m "spa: reactions-anzeige unter posts"
```

---

### Task 27: `ReplyItem.svelte`

**Files:**
- Create: `app/src/lib/components/ReplyItem.svelte`

- [ ] **Step 27.1: Komponente anlegen**

Create `app/src/lib/components/ReplyItem.svelte`:

```svelte
<script lang="ts">
  import type { NostrEvent } from '$lib/nostr/loaders';

  interface Props { event: NostrEvent }
  let { event }: Props = $props();

  const date = new Date(event.created_at * 1000).toLocaleString('de-DE');
  const authorNpub = event.pubkey.slice(0, 12) + '…';
</script>

<li class="reply">
  <div class="meta">
    <span class="author">{authorNpub}</span>
    <span class="sep">·</span>
    <span class="date">{date}</span>
  </div>
  <div class="content">{event.content}</div>
</li>

<style>
  .reply {
    list-style: none;
    padding: 0.8rem 0;
    border-bottom: 1px solid var(--border);
  }
  .meta { font-size: 0.85rem; color: var(--muted); margin-bottom: 0.3rem; }
  .author { font-family: monospace; }
  .sep { margin: 0 0.4rem; opacity: 0.5; }
  .content { white-space: pre-wrap; word-wrap: break-word; }
</style>
```

- [ ] **Step 27.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/ReplyItem.svelte
git commit -m "spa: reply-item komponente"
```

---

### Task 28: `ReplyList.svelte`

**Files:**
- Create: `app/src/lib/components/ReplyList.svelte`

- [ ] **Step 28.1: Komponente anlegen**

Create `app/src/lib/components/ReplyList.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { NostrEvent } from '$lib/nostr/loaders';
  import { loadReplies } from '$lib/nostr/loaders';
  import ReplyItem from './ReplyItem.svelte';

  interface Props { dtag: string }
  let { dtag }: Props = $props();

  let replies: NostrEvent[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      replies = await loadReplies(dtag);
    } finally {
      loading = false;
    }
  });

  export function addOptimistic(event: NostrEvent): void {
    replies = [...replies, event];
  }
</script>

<section class="replies">
  <h3>Kommentare ({replies.length})</h3>
  {#if loading}
    <p class="hint">Lade Kommentare …</p>
  {:else if replies.length === 0}
    <p class="hint">Noch keine Kommentare.</p>
  {:else}
    <ul>
      {#each replies as reply (reply.id)}
        <ReplyItem event={reply} />
      {/each}
    </ul>
  {/if}
</section>

<style>
  .replies { margin: 2rem 0; }
  h3 { font-size: 1.1rem; margin: 0 0 0.8rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  .hint { color: var(--muted); font-size: 0.9rem; }
</style>
```

- [ ] **Step 28.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/ReplyList.svelte
git commit -m "spa: reply-list komponente"
```

---

### Task 29: `ReplyComposer.svelte`

**Files:**
- Create: `app/src/lib/components/ReplyComposer.svelte`

- [ ] **Step 29.1: Komponente anlegen**

Create `app/src/lib/components/ReplyComposer.svelte`:

```svelte
<script lang="ts">
  import { hasNip07, getPublicKey, signEvent, type SignedEvent, type UnsignedEvent } from '$lib/nostr/signer';
  import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
  import { pool } from '$lib/nostr/pool';
  import { readRelays } from '$lib/stores/readRelays';
  import { get } from 'svelte/store';

  interface Props {
    /** d-Tag des Posts, auf den geantwortet wird */
    dtag: string;
    /** Event-ID des ursprünglichen Posts (für e-Tag) */
    eventId: string;
    /** Callback, wenn ein Reply erfolgreich publiziert wurde */
    onPublished?: (ev: SignedEvent) => void;
  }
  let { dtag, eventId, onPublished }: Props = $props();

  let text = $state('');
  let publishing = $state(false);
  let error: string | null = $state(null);
  let info: string | null = $state(null);

  const nip07 = hasNip07();

  async function submit() {
    error = null;
    info = null;
    if (!text.trim()) {
      error = 'Leeres Kommentar — nichts zu senden.';
      return;
    }
    publishing = true;
    try {
      const pubkey = await getPublicKey();
      if (!pubkey) {
        error = 'Nostr-Extension (z. B. Alby) hat den Pubkey nicht geliefert.';
        return;
      }
      const unsigned: UnsignedEvent = {
        kind: 1,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['a', `30023:${AUTHOR_PUBKEY_HEX}:${dtag}`],
          ['e', eventId, '', 'root'],
          ['p', AUTHOR_PUBKEY_HEX],
        ],
        content: text.trim(),
      };
      const signed = await signEvent(unsigned);
      if (!signed) {
        error = 'Signatur wurde abgelehnt oder ist fehlgeschlagen.';
        return;
      }
      const relays = get(readRelays);
      pool.publish(relays, signed);
      info = 'Kommentar gesendet.';
      text = '';
      onPublished?.(signed);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    } finally {
      publishing = false;
    }
  }
</script>

<div class="composer">
  {#if !nip07}
    <p class="hint">
      Um zu kommentieren, benötigst du eine Nostr-Extension
      (<a href="https://getalby.com" target="_blank" rel="noopener">Alby</a>,
      <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener">nos2x</a>),
      oder kommentiere direkt in einem Nostr-Client.
    </p>
  {:else}
    <textarea
      bind:value={text}
      placeholder="Dein Kommentar …"
      rows="4"
      disabled={publishing}
    ></textarea>
    <div class="actions">
      <button type="button" onclick={submit} disabled={publishing || !text.trim()}>
        {publishing ? 'Sende …' : 'Kommentar senden'}
      </button>
    </div>
    {#if error}<p class="error">{error}</p>{/if}
    {#if info}<p class="info">{info}</p>{/if}
  {/if}
</div>

<style>
  .composer { margin: 1.5rem 0; }
  textarea {
    width: 100%;
    padding: 0.6rem;
    font: inherit;
    color: inherit;
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    resize: vertical;
  }
  .actions { margin-top: 0.5rem; display: flex; justify-content: flex-end; }
  button {
    padding: 0.4rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .hint { font-size: 0.9rem; color: var(--muted); }
  .error { color: #991b1b; font-size: 0.9rem; }
  .info { color: #065f46; font-size: 0.9rem; }
</style>
```

- [ ] **Step 29.2: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/ReplyComposer.svelte
git commit -m "spa: reply-composer mit nip-07 signing"
```

---

### Task 30: Replies und Composer in PostView integrieren

**Files:**
- Modify: `app/src/lib/components/PostView.svelte`
- Modify: `app/src/routes/[...slug]/+page.svelte`

- [ ] **Step 30.1: PostView um Replies + Composer erweitern**

Modify `app/src/lib/components/PostView.svelte` — im `<script>`-Block zusätzlich:

```ts
import ReplyList from './ReplyList.svelte';
import ReplyComposer from './ReplyComposer.svelte';
import type { SignedEvent } from '$lib/nostr/signer';

let replyList: ReplyList | null = $state(null);
function handlePublished(ev: SignedEvent) {
  replyList?.addOptimistic(ev as unknown as NostrEvent);
}
```

Im Markup-Bereich, nach `<Reactions {dtag} />`:

```svelte
<ReplyComposer {dtag} eventId={event.id} onPublished={handlePublished} />
<ReplyList bind:this={replyList} {dtag} />
```

- [ ] **Step 30.2: Lokal testen**

```sh
cd app
npm run dev
```

Öffne einen Post. Erwartung: unter dem Fließtext Reactions-Chips (falls vorhanden), dann Composer (Textarea + Button), dann Kommentar-Liste.

- [ ] **Step 30.3: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/src/lib/components/PostView.svelte
git commit -m "spa: replies und composer in postview integriert"
```

---

### Task 31: E2E-Test für Home und Post (Playwright)

**Files:**
- Create: `app/playwright.config.ts`
- Create: `app/tests/e2e/home.test.ts`
- Create: `app/tests/e2e/post.test.ts`

- [ ] **Step 31.1: Playwright-Config**

Create `app/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  timeout: 60_000,
});
```

- [ ] **Step 31.2: Playwright-Browser installieren**

```sh
cd app
npx playwright install chromium
```

- [ ] **Step 31.3: Home-E2E**

Create `app/tests/e2e/home.test.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Home zeigt Profil und mindestens einen Post', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Beiträge/ })).toBeVisible();
  // Profil: mindestens Name-Element
  await expect(page.locator('.profile .name')).toBeVisible({ timeout: 15_000 });
  // Mindestens eine Post-Card
  await expect(page.locator('a.card').first()).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 31.4: Post-E2E**

Create `app/tests/e2e/post.test.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Einzelpost rendert Titel und Markdown-Body', async ({ page }) => {
  await page.goto('/dezentrale-oep-oer/');
  await expect(
    page.getByRole('heading', { level: 1, name: /Gemeinsam die Bildungszukunft/ }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('article')).toContainText('Open Educational');
});

test('Legacy-URL wird auf kurze Form umgeleitet', async ({ page }) => {
  await page.goto('/2025/03/04/dezentrale-oep-oer.html/');
  await expect(page).toHaveURL(/\/dezentrale-oep-oer\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 31.5: E2E laufen lassen**

```sh
cd app
npm run test:e2e
```

Expected: beide Tests grün. Setzt live-Relays und publizierte Events voraus (beides gegeben).

- [ ] **Step 31.6: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/playwright.config.ts app/tests/e2e/
git commit -m "spa: playwright e2e-tests für home, post, legacy-redirect"
```

---

### Task 32: Production-Build und Deploy

**Files:**
- (keine Code-Änderung, nur Ausführung)

- [ ] **Step 32.1: Production-Build**

```sh
cd app
npm run build
ls build/
```

Expected: `index.html`, `_app/`, `.htaccess`, favicon, robots.txt.

- [ ] **Step 32.2: Deploy ausführen**

Vorher: `SVELTE_FTP_*`-Variablen in `.env.local` müssen gefüllt sein, `svelte.joerg-lohrer.de` muss mit SSL aktiv sein.

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
./scripts/deploy-svelte.sh
```

Expected: Upload-Log zeigt alle Dateien, abschließend HTTP/2 200 von `https://svelte.joerg-lohrer.de/`.

- [ ] **Step 32.3: Live-Smoke-Test**

Öffne in deinem Browser:

- `https://svelte.joerg-lohrer.de/` → Liste.
- `https://svelte.joerg-lohrer.de/dezentrale-oep-oer/` → Post.
- `https://svelte.joerg-lohrer.de/2025/03/04/dezentrale-oep-oer.html/` → Post, URL-Leiste springt auf kurze Form.
- `https://svelte.joerg-lohrer.de/tag/OER/` → gefilterte Liste.
- Im Post: Tag-Klick → Tag-Seite.
- Kommentar-Komposer: wenn Alby installiert, Test-Kommentar schreiben und in der Liste sehen.

Kein Code-Commit nötig.

---

## Phase 6 — Abschlusspolish (Tasks 33–35)

### Task 33: `robots.txt` und Basic-SEO-Meta

**Files:**
- Modify: `app/static/robots.txt`
- Modify: `app/src/app.html`

- [ ] **Step 33.1: robots.txt**

Create oder überschreibe `app/static/robots.txt`:

```
User-agent: *
Allow: /
```

- [ ] **Step 33.2: OG-Tag-Defaults in app.html**

Modify `app/src/app.html` — im `<head>` vor `%sveltekit.head%` ergänzen:

```html
<meta property="og:title" content="Jörg Lohrer – Blog" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://svelte.joerg-lohrer.de/" />
<meta name="robots" content="index, follow" />
```

Hinweis: per-Post OG-Tags sind erst mit Server-Side-Rendering oder Meta-Stubs möglich — aktuell Out-of-Scope (siehe Spec §5 „Phase 3 — Stubs nachrüsten").

- [ ] **Step 33.3: Commit**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/static/robots.txt app/src/app.html
git commit -m "spa: robots.txt und default og-tags"
```

---

### Task 34: svelte-check laufen lassen und Type-Fehler beheben

**Files:**
- Alle modifizierten (Fehlerbehebungen ergeben sich aus der Ausgabe)

- [ ] **Step 34.1: Type-Check**

```sh
cd app
npm run check
```

- [ ] **Step 34.2: Falls Fehler gemeldet werden**

Jede `svelte-check`-Warnung/Error einzeln prüfen:
- Fehlender Type-Import: den Import ergänzen.
- Svelte-5-Rune-Warnings: auf die neue API umstellen (`$state`, `$derived`, `$effect`).
- `window.nostr`-Zugriff außerhalb Browser: `if (typeof window !== 'undefined')` absichern.

Iterativ fixen, bis `npm run check` sauber durchläuft.

- [ ] **Step 34.3: Commit (falls Änderungen)**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde
git add app/
git commit -m "spa: type-check-fehler behoben"
```

---

### Task 35: Redeploy nach Polish

**Files:**
- (keine Code-Änderung)

- [ ] **Step 35.1: Build + Deploy**

```sh
cd /Users/joerglohrer/repositories/joerglohrerde/app
npm run build
cd ..
./scripts/deploy-svelte.sh
```

- [ ] **Step 35.2: Live abschließen**

Prüfe nochmal:
- `https://svelte.joerg-lohrer.de/` → aktuell
- View-Source auf Homepage: OG-Tags im HTML sichtbar
- Lighthouse (in Browser-DevTools): Performance + Accessibility ≥ 90

Fertig.

---

## Phase 7 — Optionale Erweiterungen (zukünftig, außerhalb dieses Plans)

Diese Items stehen in der Spec, sind aber bewusst nicht in diesem Plan:

- **Impressum-Seite** (`/impressum/`) mit rechtlichem Text — wird als statische HTML-Datei außerhalb der SPA-Routen ergänzt, wenn der rechtliche Inhalt formuliert ist.
- **Meta-Stubs** pro Post für Social-Previews und SEO auf Post-Ebene — kommt über die Publish-Pipeline (siehe Publish-Spec §7).
- **Eigener Relay und Blossom-Server** — Infrastruktur-Erweiterung, SPA-Code unverändert, nur Einträge in `kind:10002` und `kind:10063`.
- **NIP-05-Identifier-Verifikation** im Profil (grüner Haken) — Nice-to-have.
- **Service-Worker für Offline-Caching** — bei Bedarf.

---

## Erfolgskriterien (Plan vollständig ausgeführt)

- [x] `https://svelte.joerg-lohrer.de/` zeigt Profilkachel und Post-Liste live aus Relays.
- [x] Post-Einzelansicht rendert Markdown mit Cover-Bild, Tags (klickbar), Reactions, Kommentare, Composer.
- [x] Legacy-Hugo-URLs werden auf kurze Form normalisiert.
- [x] Tag-Klick filtert zur Tag-Liste.
- [x] NIP-07-Kommentar kann mit Alby gesendet werden und erscheint optimistisch.
- [x] `npm run check` und `npm run test:unit` laufen grün.
- [x] `npm run test:e2e` (Playwright) bestätigt Happy-Path-Szenarien.
- [x] Lighthouse Accessibility ≥ 90.
