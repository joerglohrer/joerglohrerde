# Multilinguale Posts — SvelteKit-SPA (Plan 2/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die SPA liest die `a`-Tags mit Marker `translation` aus einem geladenen Post-Event, löst die referenzierten Events auf und zeigt im UI dezent einen Hinweis „Auch auf Englisch verfügbar" / „Also available in German" — verlinkt auf die Slug-URL der jeweils anderen Sprache. Slug-direkte URL-Aufrufe zeigen den Post immer ohne einschränkende Meldung.

**Architecture:** Ein neuer Loader `loadTranslations(event)` extrahiert aus dem Event die `a`-Tag-Referenzen mit Marker `translation`, lädt die zugehörigen Events parallel und liefert eine Liste `{ lang, slug, title }`. Ein neuer Svelte-Component `LanguageAvailability` rendert den Hinweis direkt unter dem Post-Titel. Kein Locale-Store, kein URL-Umbau — der aktuelle Post bestimmt die angezeigte Sprache, Umschaltung geschieht per Klick auf den Hinweis-Link.

**Tech Stack:** SvelteKit (Svelte 5 Runes), TypeScript, `applesauce-core` / `applesauce-relay` (existierend in `app/src/lib/nostr/`), Vitest für Loader-Tests.

---

## Spec-Referenz

Umsetzt den SPA-Teil der Abschnitte **Verlinkungs-Semantik**, **SPA-Verhalten** und (aus dem Fallback-Block) die einladende Sprach-Hinweis-Logik aus `docs/superpowers/specs/2026-04-21-multilingual-posts-design.md`. Out-of-scope in diesem Plan: UI-Chrome-Lokalisierung via `svelte-i18n` (kommt in Plan 3).

## Datei-Struktur

**Zu ändern:**
- `app/src/lib/nostr/loaders.ts` — neue Funktion `loadTranslations(event)`. Keine Änderung bestehender Funktionen.
- `app/src/lib/components/PostView.svelte` — Einbindung einer neuen `LanguageAvailability`-Komponente unter dem Titel; keine Änderung der bestehenden Post-Anzeige.

**Zu erstellen:**
- `app/src/lib/components/LanguageAvailability.svelte` — rendert den „Also available in …"-Hinweis. Bekommt das geladene Event als Prop.
- `app/src/lib/nostr/translations.ts` — eigene Datei für `parseTranslationRefs(event)` (reine Funktion, gut testbar ohne Relay-Zugriff). Der Loader in `loaders.ts` nutzt diesen Parser.
- `app/src/lib/nostr/translations.test.ts` — Unit-Tests für `parseTranslationRefs`.
- `app/src/lib/nostr/languageNames.ts` — kleine Lookup-Map `de`→„Deutsch", `en`→„English", plus Funktion `displayLanguage(code)`.

**Nicht angefasst:**
- `app/src/routes/[...slug]/+page.svelte` / `+page.ts` — die Route bleibt Slug-basiert, das Event wird wie bisher geladen.
- `app/src/lib/nostr/config.ts`, `pool.ts`, `relays.ts` — Relay-Setup unverändert.
- `app/src/lib/url/legacy.ts`, Layout, Startseite, Archiv, Tag-Seiten — nicht betroffen.

---

## Vorbereitung: Test-Setup prüfen

Bevor die Tasks starten: Vitest ist in `app/` vermutlich schon eingerichtet (via `@sveltejs/kit`-Template), aber nicht unbedingt für `.test.ts`-Dateien verwendet. Der erste Task verifiziert das einmalig.

---

## Task 1: Vitest-Setup prüfen und ggf. aktivieren

**Files:**
- Verify: `app/package.json`, `app/vite.config.ts` (oder `.js`)
- Create (falls nötig): `app/vitest.config.ts`

- [ ] **Step 1: Prüfen, ob Vitest bereits installiert ist**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && grep -E '"vitest"|"@vitest' package.json
```

Wenn eine Zeile ausgegeben wird, Vitest ist installiert → weiter zu Step 2.
Wenn keine Ausgabe: Installation:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Prüfen, ob ein `test`-Script existiert**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && grep -A1 '"scripts"' package.json | grep -E '"test"|"vitest"'
```

Wenn keine Zeile mit `"test":` oder `"vitest"` kommt, ergänze in `app/package.json` im `scripts`-Block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Smoke-Test**

Erstelle temporär `app/src/lib/nostr/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest läuft', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: Grüne Ausgabe, 1 passed.

Falls rot: Vitest-Setup prüfen (Config im `vite.config.ts` oder separat), dann erneut.

- [ ] **Step 4: Smoke-Datei löschen**

```bash
rm /Users/joerglohrer/repositories/joerglohrerde/app/src/lib/nostr/smoke.test.ts
```

- [ ] **Step 5: Commit (nur falls Dependencies/Scripts geändert wurden)**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/package.json app/package-lock.json && git commit -m "chore(app): vitest-test-runner setup"
```

Wenn keine Änderungen: keinen leeren Commit erzeugen, überspringen.

---

## Task 2: `parseTranslationRefs` — Parser für `a`-Tags

**Files:**
- Create: `app/src/lib/nostr/translations.ts`
- Create: `app/src/lib/nostr/translations.test.ts`

- [ ] **Step 1: Test schreiben**

Erstelle `app/src/lib/nostr/translations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseTranslationRefs } from './translations';
import type { NostrEvent } from './loaders';

function ev(tags: string[][]): NostrEvent {
  return {
    id: 'x',
    pubkey: 'p',
    created_at: 0,
    kind: 30023,
    tags,
    content: '',
    sig: 's'
  } as unknown as NostrEvent;
}

describe('parseTranslationRefs', () => {
  it('extrahiert a-tags mit marker "translation"', () => {
    const e = ev([
      ['d', 'x'],
      ['a', '30023:abc:other-slug', '', 'translation'],
      ['a', '30023:abc:third-slug', '', 'translation']
    ]);
    expect(parseTranslationRefs(e)).toEqual([
      { kind: 30023, pubkey: 'abc', dtag: 'other-slug' },
      { kind: 30023, pubkey: 'abc', dtag: 'third-slug' }
    ]);
  });

  it('ignoriert a-tags ohne marker "translation"', () => {
    const e = ev([
      ['a', '30023:abc:root-thread', '', 'root'],
      ['a', '30023:abc:x', '', 'reply']
    ]);
    expect(parseTranslationRefs(e)).toEqual([]);
  });

  it('ignoriert a-tags mit malformed coordinate', () => {
    const e = ev([
      ['a', 'not-a-coord', '', 'translation'],
      ['a', '30023:abc:ok', '', 'translation']
    ]);
    expect(parseTranslationRefs(e)).toEqual([
      { kind: 30023, pubkey: 'abc', dtag: 'ok' }
    ]);
  });

  it('leeres tag-array → leere liste', () => {
    expect(parseTranslationRefs(ev([]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: FAIL — Modul `./translations` existiert noch nicht.

- [ ] **Step 3: Parser implementieren**

Erstelle `app/src/lib/nostr/translations.ts`:

```typescript
import type { NostrEvent } from './loaders';

export interface TranslationRef {
  kind: number;
  pubkey: string;
  dtag: string;
}

const COORD_RE = /^(\d+):([0-9a-f]+):([a-z0-9][a-z0-9-]*)$/;

export function parseTranslationRefs(event: NostrEvent): TranslationRef[] {
  const refs: TranslationRef[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'a') continue;
    if (tag[3] !== 'translation') continue;
    const coord = tag[1];
    if (typeof coord !== 'string') continue;
    const m = coord.match(COORD_RE);
    if (!m) continue;
    refs.push({
      kind: parseInt(m[1], 10),
      pubkey: m[2],
      dtag: m[3]
    });
  }
  return refs;
}
```

- [ ] **Step 4: Test laufen, Erwartung PASS**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/nostr/translations.ts app/src/lib/nostr/translations.test.ts && git commit -m "feat(app): parseTranslationRefs extrahiert a-tags mit marker translation"
```

---

## Task 3: `languageNames` — Code-zu-Anzeigename

**Files:**
- Create: `app/src/lib/nostr/languageNames.ts`
- Create: `app/src/lib/nostr/languageNames.test.ts`

- [ ] **Step 1: Test schreiben**

Erstelle `app/src/lib/nostr/languageNames.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { displayLanguage } from './languageNames';

describe('displayLanguage', () => {
  it('kennt deutsch', () => {
    expect(displayLanguage('de')).toBe('Deutsch');
  });
  it('kennt english', () => {
    expect(displayLanguage('en')).toBe('English');
  });
  it('fällt bei unbekanntem code auf uppercase-code zurück', () => {
    expect(displayLanguage('fr')).toBe('FR');
  });
  it('fällt bei leerer sprache auf ? zurück', () => {
    expect(displayLanguage('')).toBe('?');
  });
});
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: FAIL.

- [ ] **Step 3: Modul implementieren**

Erstelle `app/src/lib/nostr/languageNames.ts`:

```typescript
const NAMES: Record<string, string> = {
  de: 'Deutsch',
  en: 'English'
};

export function displayLanguage(code: string): string {
  if (!code) return '?';
  return NAMES[code] ?? code.toUpperCase();
}
```

- [ ] **Step 4: Test laufen, Erwartung PASS**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: 8 passed (4 neue + 4 aus Task 2).

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/nostr/languageNames.ts app/src/lib/nostr/languageNames.test.ts && git commit -m "feat(app): displayLanguage code→anzeigename"
```

---

## Task 4: `loadTranslations` — Loader für verknüpfte Posts

**Files:**
- Modify: `app/src/lib/nostr/loaders.ts` (neue Funktion am Ende ergänzen)
- Create: `app/src/lib/nostr/loaders.loadTranslations.test.ts`

Wir schreiben den Test zuerst gegen eine Mock-Version der `collectEvents`-Schnittstelle — die echte Relay-Kommunikation wird durch Dependency-Injection in der Funktions-Signatur ausgetauscht.

- [ ] **Step 1: Test schreiben**

Erstelle `app/src/lib/nostr/loaders.loadTranslations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveTranslationsFromRefs } from './loaders';
import type { NostrEvent } from './loaders';
import type { TranslationRef } from './translations';

function ev(tags: string[][]): NostrEvent {
  return {
    id: 'x',
    pubkey: 'p',
    created_at: 0,
    kind: 30023,
    tags,
    content: '',
    sig: 's'
  } as unknown as NostrEvent;
}

describe('resolveTranslationsFromRefs', () => {
  it('liefert lang/slug/title für jeden aufgelösten ref', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p1', dtag: 'hello' }
    ];
    const fetcher = async () => [
      ev([
        ['d', 'hello'],
        ['title', 'Hello World'],
        ['L', 'ISO-639-1'],
        ['l', 'en', 'ISO-639-1']
      ])
    ];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([
      { lang: 'en', slug: 'hello', title: 'Hello World' }
    ]);
  });

  it('ignoriert refs, zu denen kein event gefunden wird', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p1', dtag: 'hello' },
      { kind: 30023, pubkey: 'p1', dtag: 'missing' }
    ];
    const fetcher = async (r: TranslationRef) =>
      r.dtag === 'hello'
        ? [ev([
            ['d', 'hello'],
            ['title', 'Hi'],
            ['l', 'en', 'ISO-639-1']
          ])]
        : [];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([{ lang: 'en', slug: 'hello', title: 'Hi' }]);
  });

  it('ignoriert events ohne l-tag (sprache unklar)', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p', dtag: 'x' }
    ];
    const fetcher = async () => [
      ev([
        ['d', 'x'],
        ['title', 'kein lang-tag']
      ])
    ];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([]);
  });

  it('leere ref-liste → leere ergebnis-liste', async () => {
    const fetcher = async () => {
      throw new Error('should not be called');
    };
    expect(await resolveTranslationsFromRefs([], fetcher)).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: FAIL — Funktion `resolveTranslationsFromRefs` nicht exportiert.

- [ ] **Step 3: Pure Funktion und Loader implementieren**

In `app/src/lib/nostr/loaders.ts`, ergänze am Ende der Datei:

```typescript
import type { TranslationRef } from './translations';

export interface TranslationInfo {
  lang: string;
  slug: string;
  title: string;
}

/**
 * Pure Variante für Tests — erhält die Events via Fetcher statt Relays.
 */
export async function resolveTranslationsFromRefs(
  refs: TranslationRef[],
  fetcher: (ref: TranslationRef) => Promise<NostrEvent[]>
): Promise<TranslationInfo[]> {
  if (refs.length === 0) return [];
  const results = await Promise.all(refs.map(fetcher));
  const infos: TranslationInfo[] = [];
  for (let i = 0; i < refs.length; i++) {
    const evs = results[i];
    if (evs.length === 0) continue;
    const latest = evs.reduce((best, cur) =>
      cur.created_at > best.created_at ? cur : best
    );
    const lang = latest.tags.find((t) => t[0] === 'l')?.[1];
    if (!lang) continue;
    const slug = latest.tags.find((t) => t[0] === 'd')?.[1] ?? refs[i].dtag;
    const title = latest.tags.find((t) => t[0] === 'title')?.[1] ?? '';
    infos.push({ lang, slug, title });
  }
  return infos;
}

/**
 * Loader: findet die anderssprachigen Varianten eines Posts.
 * Liefert leere Liste, wenn keine a-Tags mit marker "translation" vorhanden.
 */
export async function loadTranslations(
  event: NostrEvent
): Promise<TranslationInfo[]> {
  const { parseTranslationRefs } = await import('./translations');
  const refs = parseTranslationRefs(event);
  if (refs.length === 0) return [];
  const relays = get(readRelays);
  return resolveTranslationsFromRefs(refs, (ref) =>
    collectEvents(relays, {
      kinds: [ref.kind],
      authors: [ref.pubkey],
      '#d': [ref.dtag],
      limit: 1
    })
  );
}
```

**Hinweis:** `get`, `readRelays`, `collectEvents` sind bereits weiter oben in der Datei importiert bzw. definiert. Nur `TranslationRef` muss als Typ importiert werden.

- [ ] **Step 4: Test laufen, Erwartung PASS**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/nostr/loaders.ts app/src/lib/nostr/loaders.loadTranslations.test.ts && git commit -m "feat(app): loadTranslations liefert sprach-varianten eines posts"
```

---

## Task 5: `LanguageAvailability`-Komponente

**Files:**
- Create: `app/src/lib/components/LanguageAvailability.svelte`

- [ ] **Step 1: Komponente erstellen**

Erstelle `app/src/lib/components/LanguageAvailability.svelte`:

```svelte
<script lang="ts">
  import type { NostrEvent, TranslationInfo } from '$lib/nostr/loaders';
  import { loadTranslations } from '$lib/nostr/loaders';
  import { displayLanguage } from '$lib/nostr/languageNames';

  interface Props {
    event: NostrEvent;
  }
  let { event }: Props = $props();

  let translations: TranslationInfo[] = $state([]);
  let loading = $state(true);

  $effect(() => {
    const currentId = event.id;
    loading = true;
    translations = [];
    loadTranslations(event)
      .then((infos) => {
        if (event.id !== currentId) return;
        translations = infos;
      })
      .finally(() => {
        if (event.id === currentId) loading = false;
      });
  });
</script>

{#if !loading && translations.length > 0}
  <p class="availability">
    Auch verfügbar in:
    {#each translations as t, i}
      <a href="/{t.slug}/" title={t.title}>{displayLanguage(t.lang)}</a>{#if i < translations.length - 1}, {/if}
    {/each}
  </p>
{/if}

<style>
  .availability {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0.25rem 0 1rem;
  }
  .availability a {
    color: var(--accent);
    text-decoration: none;
  }
  .availability a:hover {
    text-decoration: underline;
  }
</style>
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -20
```

Expected: Keine Fehler im Zusammenhang mit `LanguageAvailability.svelte`. (Es kann pre-existierende Warnings aus anderen Dateien geben — die sind nicht Teil dieser Task.)

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/components/LanguageAvailability.svelte && git commit -m "feat(app): LanguageAvailability-komponente für sprach-varianten-hinweis"
```

---

## Task 6: Einbindung in `PostView`

**Files:**
- Modify: `app/src/lib/components/PostView.svelte`

- [ ] **Step 1: Import und Einbindung**

Öffne `app/src/lib/components/PostView.svelte`.

Ergänze im `<script>`-Block bei den bestehenden Component-Imports (nach `import ExternalClientLinks ...`) die Zeile:

```typescript
import LanguageAvailability from './LanguageAvailability.svelte';
```

- [ ] **Step 2: Komponente im Template platzieren**

Im Template, direkt **nach** der `.meta`-`<div>` (die Tags enthält) und **vor** `{#if image}`, füge ein:

```svelte
<LanguageAvailability {event} />
```

Der Block sieht danach so aus:

```svelte
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

<LanguageAvailability {event} />

{#if image}
  <p class="cover"><img src={image} alt="Cover-Bild" /></p>
{/if}
```

- [ ] **Step 3: Dev-Server starten und manuell verifizieren**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run dev 2>&1 | tail -5
```

Öffne `http://localhost:5173/bibel-selfies/` (oder einen anderen Slug) im Browser. Erwartung:
- Post rendert wie bisher.
- Unter der Meta-Zeile erscheint entweder **nichts** (keine Übersetzungen vorhanden — aktuell der Normalfall für alle 26 Posts) oder eine Zeile „Auch verfügbar in: English" — aber das passiert erst nach Task 7.

Stoppe den Dev-Server (`Ctrl+C`).

- [ ] **Step 4: Typecheck**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | grep -E "(error|✓|Error)" | head -10
```

Expected: Keine neuen Fehler durch diese Änderung.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/src/lib/components/PostView.svelte && git commit -m "feat(app): PostView zeigt sprach-verfügbarkeit"
```

---

## Task 7: Erste echte Englisch-Übersetzung + Ende-zu-Ende-Verifikation

**Files:**
- Modify: `content/posts/de/2025-04-17-bibel-selfies/index.md` (auskommentierten `a:`-Platzhalter durch aktiven Rückverweis ersetzen)
- Create: `content/posts/en/bible-selfies/index.md` (erste echte Englisch-Übersetzung, bleibt dauerhaft)

Dieser Task liefert eine erste Übersetzung in Grundzügen — wird **nicht** wieder gelöscht. Damit ist die E2E-Verifikation nebenbei erledigt und das Feature hat ab sofort sichtbaren Content.

- [ ] **Step 1: Englische Übersetzung anlegen**

Erstelle `content/posts/en/bible-selfies/index.md`. Inhaltlich eine verkürzte Übertragung des deutschen Originals (Prompts können in der Originalsprache bleiben; die Prosa wird übersetzt). Die `title`- und `slug`-Werte unterscheiden sich vom deutschen Original — Slug-Eindeutigkeit ist gewahrt.

```markdown
---
layout: post
title: "Bible Selfies"
slug: "bible-selfies"
date: 2025-04-17
description: "Bible selfies with Midjourney — prompts and results showing biblical figures as first-person selfies."
image: https://cdn.midjourney.com/41d706d7-15ed-40ca-b507-5a2d727e312f/0_2.png
tags:
  - AI-images
  - Midjourney
  - Bible
  - Selfie
  - religious-education
  - relilab
lang: en
license: https://creativecommons.org/publicdomain/zero/1.0/deed.de
a:
  - "30023:4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41:bibel-selfies"
---

# Bible Selfies

A small experiment: what if biblical scenes had been captured with a smartphone?
Using Midjourney, I generated a series of "selfies" from the perspective of biblical figures. The prompts below produced the images — some surprisingly good, some charmingly off. Originally posted in German; this is a condensed English version for the multilingual rollout of the site.

See the [German original](/bibel-selfies/) for the full gallery with embedded context.

## Example prompt

> A selfie of a woman resembling Eve in the time of the Old Testament, blurred body, holding an apple, kneeling in front of Adam. He has a shocked expression with his mouth open and wide eyes, evoking a sense of both fear and surprise. A huge snake looms behind her. Wide-angle lens, surreal humor — reminiscent of the Garden of Eden. `--v 6.0`
```

Die Dateilänge ist bewusst knapp — der Post dient als erste multilinguale Variante im System, nicht als vollwertige Content-Übersetzung. Du kannst den Inhalt später ausbauen; der `a`-Rückverweis und der Slug bleiben dabei stabil.

- [ ] **Step 2: Rückverweis im deutschen Original aktivieren**

Öffne `content/posts/de/2025-04-17-bibel-selfies/index.md` und ersetze die auskommentierten `a:`-Zeilen am Ende des Frontmatters:

```yaml
# a:
#   - "30023:4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41:<slug-der-anderssprachigen-variante>"
```

durch den aktiven Eintrag:

```yaml
a:
  - "30023:4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41:bible-selfies"
```

- [ ] **Step 3: Beide Posts publishen**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/publish && deno task publish --post bibel-selfies && deno task publish --post bible-selfies
```

Expected: `✓ bibel-selfies (update)` und `✓ bible-selfies (new)` — beide mit Relay-Erfolg.

- [ ] **Step 4: SPA manuell verifizieren**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run dev 2>&1 | tail -5
```

Öffne nacheinander:
1. `http://localhost:5173/bibel-selfies/` — erwartet: Hinweiszeile „Auch verfügbar in: English" unter Meta-Zeile, Link auf `/bible-selfies/`.
2. `http://localhost:5173/bible-selfies/` — erwartet: englischer Post rendert, Hinweiszeile „Auch verfügbar in: Deutsch", Link auf `/bibel-selfies/`.
3. `http://localhost:5173/moodle-iomad-linux/` — erwartet: **keine** Hinweiszeile (keine Übersetzung verknüpft).

Stoppe den Dev-Server.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add content/posts/ && git commit -m "feat(content): erste englische übersetzung (bible-selfies) + bidirektionaler a-tag"
```

- [ ] **Step 6: Push — GitHub-Action re-publisht automatisch**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git push
```

Der Push triggert die Action; sie sollte die beiden geänderten/neuen Posts identifizieren und re-publishen. Lokales Publishen in Step 3 ist dennoch sinnvoll, um den manuellen Test (Step 4) sofort gegen echte Relay-Daten fahren zu können.

---

## Task 8: Gesamt-Testlauf

**Files:** — (reine Verifikation, kein Code-Change)

- [ ] **Step 1: Vitest**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm test
```

Expected: Alle grün (inkl. der 12 neuen Tests aus diesem Plan).

- [ ] **Step 2: Svelte-Check**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -5
```

Expected: Keine Fehler; Warnings dürfen vorhanden sein.

- [ ] **Step 3: Build**

Run:
```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -10
```

Expected: Build erfolgreich, keine Fehler.

- [ ] **Step 4: Kein Commit nötig.**

---

## Fertig

Nach Task 8:
- `parseTranslationRefs` extrahiert `a`-Tags mit Marker `translation` aus einem Event.
- `loadTranslations` resolvt die Referenzen zu Events und liefert `{ lang, slug, title }`-Liste.
- `LanguageAvailability`-Komponente rendert dezent „Auch verfügbar in: …" unter dem Post-Titel.
- Bidirektionale Verlinkung funktioniert Ende-zu-Ende (einmalig manuell verifiziert, dann zurückgebaut).
- UI-Chrome bleibt unverändert — der nächste Plan (3/3) wird `svelte-i18n` einführen.

**Nächster Plan:** `svelte-i18n` für Menü, Buttons, Footer, Impressum-Labels.
