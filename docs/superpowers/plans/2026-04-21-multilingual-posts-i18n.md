# Multilinguale SPA — UI-Lokalisierung + Listen-Filter (Plan 3/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UI-Chrome-Strings (Menü, Footer, Buttons, Seitentitel, Meldungen) werden über `svelte-i18n` lokalisiert — `de` als Default, `en` als zweite Sprache, Browser-Locale als Initial-Auswahl. Ein Locale-Store steuert zusätzlich die Listen-Seiten (Startseite + Archiv), sodass nur Posts in der aktiven Sprache erscheinen. Ein dezenter Umschalter im Header wechselt die Sprache.

**Architecture:** Locale-Store (`writable<'de'|'en'>`) bootstrapt aus `navigator.language`, persistiert in `localStorage`, speist `svelte-i18n` und die Listen-Filter. UI-Strings liegen in `app/src/lib/i18n/messages/{de,en}.json`, werden via `$t(...)` in Templates genutzt. Listen-Seiten (`+page.svelte`, `archiv/+page.svelte`) filtern `posts` client-seitig nach `l`-Tag gegen den aktiven Locale.

**Tech Stack:** SvelteKit (Svelte 5 Runes), TypeScript, `svelte-i18n` (runtime, ~10 KB), Vitest.

---

## Spec-Referenz

Umsetzt den Abschnitt **UI-Lokalisierung (Chrome)** sowie die noch offene „Nur Posts der aktiven Sprache in Listen zeigen"-Forderung aus `docs/superpowers/specs/2026-04-21-multilingual-posts-design.md`. Damit sind alle Spec-Anforderungen nach Plan 1/2/3 umgesetzt.

## Datei-Struktur

**Zu erstellen:**
- `app/src/lib/i18n/index.ts` — initialisiert `svelte-i18n`, registriert Locale-Bundles, exportiert `t`, `locale` und den projekteigenen `activeLocale`-Store.
- `app/src/lib/i18n/messages/de.json` — DE-Strings für UI-Chrome.
- `app/src/lib/i18n/messages/en.json` — EN-Strings, identische Keys.
- `app/src/lib/i18n/activeLocale.ts` — Custom-Writable-Store, der Locale persistiert (localStorage) und mit `svelte-i18n` syncronisiert.
- `app/src/lib/i18n/activeLocale.test.ts` — Unit-Tests für Bootstrap, Persistence, Fallback.
- `app/src/lib/components/LanguageSwitcher.svelte` — Umschalter im Header, zwei Buttons „DE/EN".

**Zu ändern:**
- `app/src/routes/+layout.svelte` — Menü-/Footer-Strings via `$t`, `LanguageSwitcher` einbinden, i18n-Init im Script.
- `app/src/routes/+page.svelte` — Hero-Texte via `$t`, Liste nach `activeLocale` filtern.
- `app/src/routes/archiv/+page.svelte` — Seitenüberschrift via `$t`, Liste nach `activeLocale` filtern.
- `app/src/routes/impressum/+page.svelte` — Alle statischen Strings via `$t`.
- `app/src/routes/[...slug]/+page.svelte` — Breadcrumb („← Zurück zur Übersicht") via `$t`; Fehlermeldungen via `$t`.
- `app/src/lib/components/LoadingOrError.svelte` — falls es hartkodierte Strings enthält, auf `$t` umstellen.
- `app/src/lib/components/LanguageAvailability.svelte` — „Auch verfügbar in:" via `$t` statt hartkodiert.
- `app/src/lib/components/PostView.svelte` — „(ohne Titel)" + Datumsformat-Locale via `$t` bzw. `activeLocale`.
- `app/package.json` — `svelte-i18n` als Dependency.

**Nicht angefasst:**
- Post-Content (`event.content`) — Markdown-Body bleibt in Autorensprache, wird nicht übersetzt.
- `app/src/lib/nostr/*` — Relay-Loader sind sprach-agnostisch.
- URL-Schema — weiterhin `/<slug>/`, kein Sprach-Präfix.

---

## Task 1: svelte-i18n installieren und Messages-Files anlegen

**Files:**
- Create: `app/src/lib/i18n/messages/de.json`, `app/src/lib/i18n/messages/en.json`
- Modify: `app/package.json`, `app/package-lock.json`

- [ ] **Step 1: Dependency installieren**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm install svelte-i18n
```

Prüfen:
```bash
grep "svelte-i18n" /Users/joerglohrer/repositories/joerglohrerde/app/package.json
```
Expected: eine Zeile wie `"svelte-i18n": "^4.x.x"`.

- [ ] **Step 2: Messages-Dateien anlegen**

Erstelle `app/src/lib/i18n/messages/de.json`:

```json
{
  "nav": {
    "home": "Home",
    "archive": "Archiv",
    "imprint": "Impressum",
    "brand_aria": "Zur Startseite"
  },
  "home": {
    "greeting": "Hi 🖖 Willkommen auf meinem Blog 🤗",
    "latest": "Neueste Beiträge",
    "more_archive": "Alle Beiträge im Archiv →",
    "empty": "Keine Posts gefunden auf den abgefragten Relays."
  },
  "archive": {
    "title": "Archiv",
    "subtitle": "Alle Beiträge, nach Jahr gruppiert.",
    "doc_title": "Archiv – Jörg Lohrer"
  },
  "post": {
    "back_to_overview": "← Zurück zur Übersicht",
    "untitled": "(ohne Titel)",
    "published_on": "Veröffentlicht am {date}",
    "also_available_in": "Auch verfügbar in:",
    "not_found": "Post \"{slug}\" nicht gefunden.",
    "unknown_error": "Unbekannter Fehler"
  },
  "imprint": {
    "doc_title": "Impressum – Jörg Lohrer"
  },
  "lang": {
    "de": "Deutsch",
    "en": "English",
    "switch_aria": "Sprache wechseln"
  }
}
```

Erstelle `app/src/lib/i18n/messages/en.json` mit denselben Keys:

```json
{
  "nav": {
    "home": "Home",
    "archive": "Archive",
    "imprint": "Imprint",
    "brand_aria": "Go to homepage"
  },
  "home": {
    "greeting": "Hi 🖖 Welcome to my blog 🤗",
    "latest": "Latest posts",
    "more_archive": "All posts in the archive →",
    "empty": "No posts found on the queried relays."
  },
  "archive": {
    "title": "Archive",
    "subtitle": "All posts, grouped by year.",
    "doc_title": "Archive – Jörg Lohrer"
  },
  "post": {
    "back_to_overview": "← Back to overview",
    "untitled": "(untitled)",
    "published_on": "Published on {date}",
    "also_available_in": "Also available in:",
    "not_found": "Post \"{slug}\" not found.",
    "unknown_error": "Unknown error"
  },
  "imprint": {
    "doc_title": "Imprint – Jörg Lohrer"
  },
  "lang": {
    "de": "German",
    "en": "English",
    "switch_aria": "Switch language"
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/package.json app/package-lock.json app/src/lib/i18n/messages/de.json app/src/lib/i18n/messages/en.json && git commit -m "chore(app): svelte-i18n + ui-messages-files (de/en)"
```

---

## Task 2: `activeLocale`-Store mit Persistence

**Files:**
- Create: `app/src/lib/i18n/activeLocale.ts`
- Create: `app/src/lib/i18n/activeLocale.test.ts`

- [ ] **Step 1: Test schreiben**

Erstelle `app/src/lib/i18n/activeLocale.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectInitialLocale } from './activeLocale';

describe('detectInitialLocale', () => {
  beforeEach(() => {
    // Kein localStorage zwischen Tests
    globalThis.localStorage?.clear?.();
  });

  it('nimmt wert aus localStorage, wenn vorhanden und gültig', () => {
    const storage = new Map<string, string>([['locale', 'en']]);
    expect(detectInitialLocale({
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: () => {}
      },
      navigatorLanguage: 'de-DE',
      supported: ['de', 'en']
    })).toBe('en');
  });

  it('fällt auf navigator.language zurück, wenn storage leer', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'en-US',
      supported: ['de', 'en']
    })).toBe('en');
  });

  it('normalisiert navigator.language (de-DE → de)', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'de-AT',
      supported: ['de', 'en']
    })).toBe('de');
  });

  it('fällt auf ersten supported eintrag, wenn navigator unbekannt', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'fr-FR',
      supported: ['de', 'en']
    })).toBe('de');
  });

  it('ignoriert ungültige werte im storage', () => {
    const storage = new Map<string, string>([['locale', 'fr']]);
    expect(detectInitialLocale({
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: () => {}
      },
      navigatorLanguage: 'en-US',
      supported: ['de', 'en']
    })).toBe('en');
  });
});
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit
```

Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Store und Detect-Funktion implementieren**

Erstelle `app/src/lib/i18n/activeLocale.ts`:

```typescript
import { writable, type Writable } from 'svelte/store';

export type SupportedLocale = 'de' | 'en';
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['de', 'en'] as const;
const STORAGE_KEY = 'locale';

interface Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface DetectArgs {
  storage: Storage;
  navigatorLanguage: string | undefined;
  supported: readonly string[];
}

export function detectInitialLocale(args: DetectArgs): SupportedLocale {
  const stored = args.storage.getItem(STORAGE_KEY);
  if (stored && (args.supported as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  const nav = (args.navigatorLanguage ?? '').slice(0, 2).toLowerCase();
  if ((args.supported as readonly string[]).includes(nav)) {
    return nav as SupportedLocale;
  }
  return args.supported[0] as SupportedLocale;
}

function createActiveLocale(): Writable<SupportedLocale> & { bootstrap: () => void } {
  const store = writable<SupportedLocale>('de');
  let bootstrapped = false;

  function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    if (typeof window === 'undefined') return;
    const initial = detectInitialLocale({
      storage: window.localStorage,
      navigatorLanguage: window.navigator.language,
      supported: SUPPORTED_LOCALES
    });
    store.set(initial);
    store.subscribe((v) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, v);
      } catch {
        // private-mode / quota — ignorieren
      }
    });
  }

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    bootstrap
  };
}

export const activeLocale = createActiveLocale();
```

- [ ] **Step 4: Test laufen, Erwartung PASS**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit
```

Expected: 46 passed (41 pre-existing + 5 neue).

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/i18n/activeLocale.ts app/src/lib/i18n/activeLocale.test.ts && git commit -m "feat(app): activeLocale-store mit persistence + initial-detection"
```

---

## Task 3: `i18n/index.ts` — svelte-i18n-Registrierung und Sync

**Files:**
- Create: `app/src/lib/i18n/index.ts`

- [ ] **Step 1: Datei erstellen**

Erstelle `app/src/lib/i18n/index.ts`:

```typescript
import { addMessages, init, locale, _ } from 'svelte-i18n';
import de from './messages/de.json';
import en from './messages/en.json';
import { activeLocale, SUPPORTED_LOCALES } from './activeLocale';

let initialized = false;

export function initI18n(): void {
  if (initialized) return;
  initialized = true;
  addMessages('de', de);
  addMessages('en', en);
  init({
    fallbackLocale: 'de',
    initialLocale: 'de'
  });
  activeLocale.bootstrap();
  activeLocale.subscribe((l) => {
    locale.set(l);
  });
}

export { _ as t, locale, activeLocale, SUPPORTED_LOCALES };
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -5
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/i18n/index.ts && git commit -m "feat(app): i18n-init registriert messages und syncs mit activeLocale"
```

---

## Task 4: `LanguageSwitcher`-Komponente

**Files:**
- Create: `app/src/lib/components/LanguageSwitcher.svelte`

- [ ] **Step 1: Komponente erstellen**

Erstelle `app/src/lib/components/LanguageSwitcher.svelte`:

```svelte
<script lang="ts">
  import { t, activeLocale, SUPPORTED_LOCALES } from '$lib/i18n';
  import type { SupportedLocale } from '$lib/i18n/activeLocale';

  let current = $state<SupportedLocale>('de');
  activeLocale.subscribe((v) => (current = v));

  function select(lang: SupportedLocale) {
    activeLocale.set(lang);
  }
</script>

<div class="switcher" role="group" aria-label={$t('lang.switch_aria')}>
  {#each SUPPORTED_LOCALES as code}
    <button
      type="button"
      class="btn"
      class:active={current === code}
      aria-pressed={current === code}
      onclick={() => select(code)}
    >{code.toUpperCase()}</button>
  {/each}
</div>

<style>
  .switcher {
    display: inline-flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }
  .btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 3px;
    padding: 1px 7px;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: inherit;
  }
  .btn:hover {
    color: var(--fg);
  }
  .btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/components/LanguageSwitcher.svelte && git commit -m "feat(app): LanguageSwitcher-komponente mit de/en-buttons"
```

---

## Task 5: Layout lokalisieren + Switcher einbinden

**Files:**
- Modify: `app/src/routes/+layout.svelte`

- [ ] **Step 1: Imports und i18n-Init ergänzen**

Öffne `app/src/routes/+layout.svelte`. Im `<script>`-Block, nach `import { bootstrapReadRelays } ...`, ergänze:

```typescript
import { initI18n, t } from '$lib/i18n';
import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

initI18n();
```

- [ ] **Step 2: Brand-ARIA und Nav-Labels umstellen**

Ersetze den Header-Block:

```svelte
<header class="site-header">
	<div class="header-inner">
		<a href="/" class="brand" aria-label="Zur Startseite">Jörg Lohrer</a>
		<nav aria-label="Hauptnavigation">
			<a href="/" class:active={isActive('/')}>Home</a>
			<a href="/archiv/" class:active={isActive('/archiv/')}>Archiv</a>
			<a href="/impressum/" class:active={isActive('/impressum/')}>Impressum</a>
		</nav>
	</div>
</header>
```

durch:

```svelte
<header class="site-header">
	<div class="header-inner">
		<a href="/" class="brand" aria-label={$t('nav.brand_aria')}>Jörg Lohrer</a>
		<nav aria-label={$t('nav.brand_aria')}>
			<a href="/" class:active={isActive('/')}>{$t('nav.home')}</a>
			<a href="/archiv/" class:active={isActive('/archiv/')}>{$t('nav.archive')}</a>
			<a href="/impressum/" class:active={isActive('/impressum/')}>{$t('nav.imprint')}</a>
			<LanguageSwitcher />
		</nav>
	</div>
</header>
```

- [ ] **Step 3: Impressum-Footer-Link-Label per `$t`**

Im Footer-Block, ersetze `<a href="/impressum/">Impressum</a>` durch:

```svelte
<a href="/impressum/">{$t('nav.imprint')}</a>
```

- [ ] **Step 4: Dev-Server starten und im Browser prüfen**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && timeout 15 npm run dev 2>&1 | head -5
```

Falls Vite einen Server ohne Fehler startet, ist die Basis OK.

- [ ] **Step 5: Typecheck + Tests**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
```

Expected: 0 Errors, 46 Tests passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/routes/+layout.svelte && git commit -m "feat(app): layout-header lokalisiert + sprach-switcher eingebunden"
```

---

## Task 6: Startseite (`+page.svelte`) lokalisieren + Listen-Filter

**Files:**
- Modify: `app/src/routes/+page.svelte`

- [ ] **Step 1: Imports ergänzen**

Öffne `app/src/routes/+page.svelte`. Im `<script>`-Block, ergänze nach den bestehenden Imports:

```typescript
import { t, activeLocale } from '$lib/i18n';
import { get } from 'svelte/store';
```

- [ ] **Step 2: Filter-Hilfsfunktion und `latest` anpassen**

Direkt vor `const latest = $derived(posts.slice(0, LATEST_COUNT));` die bestehende Zeile ersetzen durch:

```typescript
let currentLocale = $state('de');
activeLocale.subscribe((v) => (currentLocale = v));

const filtered = $derived.by(() =>
	posts.filter((p) => {
		const l = p.tags.find((t) => t[0] === 'l')?.[1];
		// Ohne l-tag: als 'de' behandeln, damit alte Posts sichtbar bleiben
		return (l ?? 'de') === currentLocale;
	})
);
const latest = $derived(filtered.slice(0, LATEST_COUNT));
const hasMore = $derived(filtered.length > LATEST_COUNT);
```

(Die bestehende `hasMore`-Zeile weiter unten entfernen, sonst doppelt.)

- [ ] **Step 3: Fehler- und Titel-Strings per `$t`**

Ersetze in `onMount`:

```typescript
if (list.length === 0) {
  error = 'Keine Posts gefunden auf den abgefragten Relays.';
}
```
durch:
```typescript
if (list.length === 0) {
  error = get(t)('home.empty');
}
```

und:
```typescript
error = e instanceof Error ? e.message : 'Unbekannter Fehler';
```
durch:
```typescript
error = e instanceof Error ? e.message : get(t)('post.unknown_error');
```

- [ ] **Step 4: Template-Strings umstellen**

Ersetze im Template:

```svelte
<p class="hero-greeting">
	Hi <span aria-hidden="true">🖖</span> Willkommen auf meinem Blog
	<span aria-hidden="true">🤗</span>
</p>
```

durch:

```svelte
<p class="hero-greeting">{$t('home.greeting')}</p>
```

Ersetze `<h2 class="section-title">Neueste Beiträge</h2>` durch:

```svelte
<h2 class="section-title">{$t('home.latest')}</h2>
```

Ersetze den „Alle Beiträge im Archiv →"-Link durch:

```svelte
<a href="/archiv/" class="more-link">{$t('home.more_archive')}</a>
```

- [ ] **Step 5: Typecheck + Tests**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
```

Expected: 0 Errors, 46 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/routes/+page.svelte && git commit -m "feat(app): startseite lokalisiert + liste nach aktivem locale gefiltert"
```

---

## Task 7: Archiv-Seite lokalisieren + Listen-Filter

**Files:**
- Modify: `app/src/routes/archiv/+page.svelte`

- [ ] **Step 1: Imports ergänzen**

Im `<script>`-Block nach den existierenden Imports:

```typescript
import { t, activeLocale } from '$lib/i18n';
import { get } from 'svelte/store';
```

- [ ] **Step 2: Filter einbauen und `groupsByYear` daran knüpfen**

Direkt vor `const groupsByYear = ...`:

```typescript
let currentLocale = $state('de');
activeLocale.subscribe((v) => (currentLocale = v));

const filtered = $derived.by(() =>
	posts.filter((p) => {
		const l = p.tags.find((t) => t[0] === 'l')?.[1];
		return (l ?? 'de') === currentLocale;
	})
);
```

Ersetze in `groupsByYear` das `for (const p of posts)` durch `for (const p of filtered)`.

- [ ] **Step 3: Fehler-Strings per `$t`**

Ersetze in `onMount`:
```typescript
error = 'Keine Posts gefunden auf den abgefragten Relays.';
```
→
```typescript
error = get(t)('home.empty');
```

und:
```typescript
error = e instanceof Error ? e.message : 'Unbekannter Fehler';
```
→
```typescript
error = e instanceof Error ? e.message : get(t)('post.unknown_error');
```

- [ ] **Step 4: Template-Strings umstellen**

Ersetze:

```svelte
<svelte:head>
	<title>Archiv – Jörg Lohrer</title>
</svelte:head>

<h1 class="title">Archiv</h1>
<p class="meta">Alle Beiträge, nach Jahr gruppiert.</p>
```

durch:

```svelte
<svelte:head>
	<title>{$t('archive.doc_title')}</title>
</svelte:head>

<h1 class="title">{$t('archive.title')}</h1>
<p class="meta">{$t('archive.subtitle')}</p>
```

- [ ] **Step 5: Typecheck + Tests**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
```

Expected: 0 Errors, 46 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/routes/archiv/+page.svelte && git commit -m "feat(app): archiv-seite lokalisiert + nach locale gefiltert"
```

---

## Task 8: Post-Route + Komponenten lokalisieren

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`
- Modify: `app/src/lib/components/LanguageAvailability.svelte`
- Modify: `app/src/lib/components/PostView.svelte`

- [ ] **Step 1: Post-Route**

Öffne `app/src/routes/[...slug]/+page.svelte`. Im `<script>`-Block, nach den bestehenden Imports:

```typescript
import { t } from '$lib/i18n';
import { get } from 'svelte/store';
```

Ersetze im `$effect`-Block:
```typescript
error = `Post "${currentDtag}" nicht gefunden.`;
```
→
```typescript
error = get(t)('post.not_found', { values: { slug: currentDtag } });
```

Ersetze:
```typescript
error = e instanceof Error ? e.message : 'Unbekannter Fehler';
```
→
```typescript
error = e instanceof Error ? e.message : get(t)('post.unknown_error');
```

Ersetze im Template:
```svelte
<nav class="breadcrumb"><a href="/">← Zurück zur Übersicht</a></nav>
```
→
```svelte
<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>
```

- [ ] **Step 2: LanguageAvailability**

Öffne `app/src/lib/components/LanguageAvailability.svelte`. Import ergänzen:

```typescript
import { t } from '$lib/i18n';
```

Ersetze im Template:
```svelte
Auch verfügbar in:
```
→
```svelte
{$t('post.also_available_in')}
```

- [ ] **Step 3: PostView — „ohne Titel" + Datums-Locale**

Öffne `app/src/lib/components/PostView.svelte`. Import ergänzen:

```typescript
import { t, activeLocale } from '$lib/i18n';
```

Ersetze:
```typescript
const title = $derived(tagValue(event, 'title') || '(ohne Titel)');
```
→
```typescript
let currentLocale = $state('de');
activeLocale.subscribe((v) => (currentLocale = v));

const title = $derived(tagValue(event, 'title') || $t('post.untitled'));
```

Und den Datums-Block:
```typescript
const date = $derived(
	new Date(publishedAt * 1000).toLocaleDateString('de-DE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
);
```
→
```typescript
const date = $derived(
	new Date(publishedAt * 1000).toLocaleDateString(
		currentLocale === 'en' ? 'en-US' : 'de-DE',
		{ year: 'numeric', month: 'long', day: 'numeric' }
	)
);
```

Und im Template:
```svelte
Veröffentlicht am {date}
```
→
```svelte
{$t('post.published_on', { values: { date } })}
```

- [ ] **Step 4: Typecheck + Tests**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
```

Expected: 0 Errors, 46 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add 'app/src/routes/[...slug]/+page.svelte' app/src/lib/components/LanguageAvailability.svelte app/src/lib/components/PostView.svelte && git commit -m "feat(app): post-route + komponenten lokalisiert (titel, datum, hinweise)"
```

---

## Task 9: Impressum lokalisieren

**Files:**
- Modify: `app/src/routes/impressum/+page.svelte`

Impressum hat einen Mix aus Template-Text und Rechts-Text (Postanschrift), der nicht übersetzt werden sollte. Wir lokalisieren den Seitentitel und ggf. Überschriften — der juristische Kern (Anbieterkennzeichnung, Haftungshinweise) bleibt auf Deutsch.

- [ ] **Step 1: Datei öffnen und sichten**

```bash
cat /Users/joerglohrer/repositories/joerglohrerde/app/src/routes/impressum/+page.svelte
```

- [ ] **Step 2: Minimal-Anpassung**

Ergänze im `<script>`-Block (oder erstelle ihn, falls er fehlt):

```svelte
<script lang="ts">
	import { t } from '$lib/i18n';
</script>
```

Ersetze `<svelte:head><title>Impressum – Jörg Lohrer</title></svelte:head>` durch:

```svelte
<svelte:head>
	<title>{$t('imprint.doc_title')}</title>
</svelte:head>
```

Der restliche Inhalt bleibt auf Deutsch — juristische Anbieterkennzeichnung nach deutschem Recht; eine englische Version würde neue rechtliche Prüfung erfordern (Out of Scope).

- [ ] **Step 3: Typecheck**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
```

Expected: 0 Errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/routes/impressum/+page.svelte && git commit -m "feat(app): impressum-seitentitel lokalisiert (inhalt bleibt DE)"
```

---

## Task 10: Ende-zu-Ende-Test im Browser

**Files:** — (reine Verifikation)

- [ ] **Step 1: Dev-Server**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run dev
```

- [ ] **Step 2: Browser-Tests**

Öffne `http://localhost:5173/`. Prüfe:

1. **Standard-Locale:** Erstes Öffnen — Sprache ist `de` (wenn Browser deutsch) oder `en` (wenn englisch). Titel, Menü, Greeting in dieser Sprache.
2. **Switcher klicken:** Klick auf „EN" im Header-Switcher — Menü, Greeting, „Latest posts", Archiv-Link-Text wechseln. URL ändert sich **nicht**.
3. **Liste gefiltert:** Startseite zeigt nur englische Posts (Bible Selfies), Archiv nur englische. Klick auf „DE" — deutsche Posts erscheinen.
4. **Post-Detail:** Klick auf einen deutschen Post (Liste auf DE) — Datumsformat deutsch („17. April 2025"). Klick auf „Auch verfügbar in: English" auf `bibel-selfies` — englische Version erscheint, Datumsformat englisch („April 17, 2025"), Breadcrumb „← Back to overview".
5. **Persistence:** Browser-Seite reload — aktive Sprache bleibt (aus localStorage).
6. **404-Case:** Öffne `/nicht-da/` — Fehlermeldung im aktiven Locale.

Stoppe Dev-Server.

- [ ] **Step 3: Kein Commit nötig.**

---

## Task 11: Gesamt-Testlauf + Deploy

**Files:** — (Verifikation + Deploy)

- [ ] **Step 1: Vitest**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit
```

Expected: 46 passed.

- [ ] **Step 2: Svelte-check**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Build**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -10
```

Expected: Build erfolgreich.

- [ ] **Step 4: Push und Deploy auf prod**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git push
DEPLOY_TARGET=prod /Users/joerglohrer/repositories/joerglohrerde/scripts/deploy-svelte.sh 2>&1 | tail -10
```

**WICHTIG:** `DEPLOY_TARGET=prod` explizit setzen. Der Skript-Default zielt auf `svelte.joerg-lohrer.de` (historischer Cutover-Stand). Prod-Cutover läuft über STAGING_FTP_*-Webroot mit SITE_URL `https://joerg-lohrer.de` — das ist das `prod`-Target.

Expected: Upload fertig, Live-Check HTTP 200 mit aktuellem `last-modified`.

- [ ] **Step 5: Live-Verifikation**

Öffne `https://joerg-lohrer.de/` und wiederhole Task 10 Step 2 auf der Live-Seite.

- [ ] **Step 6: Kein Commit — Abschluss.**

---

## Fertig

Nach Task 11:
- `svelte-i18n` aktiv, UI-Chrome in `de`/`en`
- Locale-Store mit Persistence + Browser-Locale-Default
- `LanguageSwitcher` im Header, zwei Buttons
- Listen-Seiten (Startseite + Archiv) nur Posts des aktiven Locales
- PostView zeigt Datum im aktiven Locale, Hinweise übersetzt
- Impressum-Titel übersetzt, juristischer Inhalt bewusst DE
- Live-Deploy auf prod

**Damit ist die Spec `2026-04-21-multilingual-posts-design.md` vollständig umgesetzt — über Plan 1 (Publish-Pipeline), Plan 2 (SPA-Translation-Links) und Plan 3 (UI-i18n + Listen-Filter).**
