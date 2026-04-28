# Prerender-Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post-Detailseiten unter `https://joerg-lohrer.de/<d-tag>/` werden zur Build-Zeit zu statischem HTML mit OG-/Twitter-/JSON-LD-Tags prerendered, auf Basis eines Deno-Snapshot-Tools, das die Post-Daten aus den Relays in JSON-Artefakte schreibt.

**Architecture:** Drei entkoppelte Stufen — `publish` bleibt unverändert; ein neues `snapshot/`-Modul (Deno) liest Events von den Relays und schreibt JSON; SvelteKit prerendert die Detail-Routen aus diesen JSON-Dateien. Frische Nostr-first-Posts fallen weiter über `adapter-static`-`fallback: 'index.html'` auf Runtime-Hydration.

**Tech Stack:** Deno (`@std/path`, `@std/yaml`, `nostr-tools`, `applesauce-relay`, `rxjs`), SvelteKit 2 mit `adapter-static`, `marked` + `isomorphic-dompurify` + `highlight.js`, Vitest (jsdom + node), bash + `lftp` für Deploy.

**Spec:** [`docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md`](../specs/2026-04-21-prerender-snapshot-design.md).

**Migrations-Strategie:** Sechs entkoppelte Etappen, jede einzeln getestet, einzeln committed, einzeln rollback-bar. Reihenfolge ist Pflicht — frühere Etappen sind Vorbedingung für spätere.

---

## Etappe 1 — `renderMarkdown` Node-kompatibel

Heute wirft `renderMarkdown` hart, wenn `window === undefined`. Der SvelteKit-Build läuft in Node — die Funktion muss dort funktionieren, ohne dass die Browser-Variante kaputtgeht.

### Task 1.1: Failing Node-Test für renderMarkdown

**Files:**
- Test: `app/src/lib/render/markdown.node.test.ts` (neu)

- [ ] **Step 1.1.1: Test schreiben**

```ts
// app/src/lib/render/markdown.node.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown (Node-Kontext)', () => {
  it('rendert einfaches Markdown im Node-Build ohne window', () => {
    const html = renderMarkdown('# Hallo\n\nWelt mit *Kursiv* und [Link](https://example.com)');
    expect(html).toContain('<h1');
    expect(html).toContain('Hallo');
    expect(html).toContain('<em>Kursiv</em>');
    expect(html).toContain('href="https://example.com"');
  });

  it('sanitisiert XSS-Versuche', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nText');
    expect(html).not.toContain('<script');
    expect(html).toContain('Text');
  });

  it('hebt code-blocks mit highlight.js hervor', () => {
    const html = renderMarkdown('```ts\nconst x: number = 1;\n```');
    expect(html).toContain('class="hljs');
    expect(html).toContain('language-ts');
  });
});
```

- [ ] **Step 1.1.2: Test laufen lassen → muss fehlschlagen**

Run: `cd app && npx vitest run src/lib/render/markdown.node.test.ts`
Expected: FAIL — entweder mit `renderMarkdown: DOM-Kontext erforderlich` oder mit ReferenceError zu `window`/`document`.

- [ ] **Step 1.1.3: Commit Test-Datei**

```bash
git add app/src/lib/render/markdown.node.test.ts
git commit -m "test: failing node-test fuer renderMarkdown

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2: isomorphic-dompurify einführen

**Files:**
- Modify: `app/package.json`
- Modify: `app/src/lib/render/markdown.ts`

- [ ] **Step 1.2.1: Dependency installieren**

```bash
cd app && npm install isomorphic-dompurify
```

Erwartung: `isomorphic-dompurify` landet unter `dependencies` in `package.json`.

- [ ] **Step 1.2.2: `markdown.ts` umstellen**

Komplette neue Fassung von `app/src/lib/render/markdown.ts`:

```ts
import { Marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
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

const markedInstance = new Marked({
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
    }
  }
});

export function renderMarkdown(md: string): string {
  const raw = markedInstance.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
```

- [ ] **Step 1.2.3: Node-Test laufen lassen → muss passen**

Run: `cd app && npx vitest run src/lib/render/markdown.node.test.ts`
Expected: PASS — alle drei Test-Cases grün.

- [ ] **Step 1.2.4: Bestehende Tests laufen lassen → keine Regression**

Run: `cd app && npm run test:unit`
Expected: alle Tests grün, inklusive der Browser/jsdom-Cases (die wegen `isomorphic-dompurify` automatisch im Browser auf das DOMPurify-Browser-Backend zurückfallen).

- [ ] **Step 1.2.5: TypeScript-Check**

Run: `cd app && npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 1.2.6: Commit**

```bash
git add app/package.json app/package-lock.json app/src/lib/render/markdown.ts
git commit -m "feat(render): renderMarkdown auf isomorphic-dompurify umgestellt

Funktioniert jetzt sowohl in Browser/jsdom als auch in Node (SvelteKit-Build).
Schritt 1 der prerender-snapshot-migration. Verhalten in der SPA unveraendert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Etappe 2 — Snapshot-Modul (Deno)

Neues Verzeichnis `snapshot/` als Geschwister zu `publish/`. Liest Events von Relays, schreibt JSON. Keine Änderung an SPA in dieser Etappe.

### Task 2.1: Modul-Skelett mit deno.jsonc

**Files:**
- Create: `snapshot/deno.jsonc`
- Create: `snapshot/.gitignore`
- Create: `snapshot/README.md`

- [ ] **Step 2.1.1: deno.jsonc anlegen**

```jsonc
{
  "tasks": {
    "snapshot": "deno run --env-file=../.env.local --allow-env --allow-read --allow-write --allow-net src/cli.ts",
    "test": "deno test --allow-env --allow-read --allow-write --allow-net",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "imports": {
    "@std/yaml": "jsr:@std/yaml@^1.0.5",
    "@std/cli": "jsr:@std/cli@^1.0.6",
    "@std/fs": "jsr:@std/fs@^1.0.4",
    "@std/path": "jsr:@std/path@^1.0.6",
    "@std/testing": "jsr:@std/testing@^1.0.3",
    "@std/assert": "jsr:@std/assert@^1.0.6",
    "@std/encoding": "jsr:@std/encoding@^1.0.5",
    "nostr-tools": "npm:nostr-tools@^2.10.4",
    "applesauce-relay": "npm:applesauce-relay@^2.0.0",
    "rxjs": "npm:rxjs@^7.8.1"
  },
  "fmt": {
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": false,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

- [ ] **Step 2.1.2: .gitignore anlegen**

```
output/
.last-snapshot.json
```

- [ ] **Step 2.1.3: README.md anlegen**

```markdown
# snapshot/

Liest die `kind:30023`-Events des Site-Autors von den Read-Relays und
schreibt sie als JSON-Artefakte für den SvelteKit-Prerender-Schritt.
Kein Live-Proxy: Relays werden nur zur Build-Zeit befragt.

Spec: [`../docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md`](../docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md)

## Nutzung

```sh
cd snapshot
deno task snapshot                    # default
deno task snapshot --out ./output     # alternatives Ziel
deno task snapshot --min-events 20    # Schwelle
deno task snapshot --allow-shrink     # Drop-Check aus
```

Erwartet diese Env-Vars (aus `../.env.local`):

- `AUTHOR_PUBKEY_HEX` (64 hex chars)
- `BOOTSTRAP_RELAY` (wss-URL)
```

- [ ] **Step 2.1.4: Commit Skelett**

```bash
git add snapshot/deno.jsonc snapshot/.gitignore snapshot/README.md
git commit -m "feat(snapshot): modul-skelett

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.2: Config-Modul mit Tests

**Files:**
- Create: `snapshot/src/core/config.ts`
- Test: `snapshot/tests/config.test.ts`

- [ ] **Step 2.2.1: Failing Test**

```ts
// snapshot/tests/config.test.ts
import { assertEquals, assertThrows } from '@std/assert'
import { loadConfig } from '../src/core/config.ts'

Deno.test('loadConfig liest pubkey + bootstrap relay', () => {
  Deno.env.set('AUTHOR_PUBKEY_HEX', '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  const cfg = loadConfig()
  assertEquals(cfg.authorPubkeyHex, '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41')
  assertEquals(cfg.bootstrapRelay, 'wss://relay.primal.net')
})

Deno.test('loadConfig wirft bei fehlendem AUTHOR_PUBKEY_HEX', () => {
  Deno.env.delete('AUTHOR_PUBKEY_HEX')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  assertThrows(() => loadConfig(), Error, 'AUTHOR_PUBKEY_HEX')
})

Deno.test('loadConfig wirft bei ungueltigem hex', () => {
  Deno.env.set('AUTHOR_PUBKEY_HEX', 'nicht-hex')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  assertThrows(() => loadConfig(), Error, '64 hex')
})
```

- [ ] **Step 2.2.2: Test laufen lassen → muss fehlschlagen**

Run: `cd snapshot && deno test tests/config.test.ts`
Expected: FAIL — Modul existiert noch nicht.

- [ ] **Step 2.2.3: Implementation**

```ts
// snapshot/src/core/config.ts
export interface Config {
  authorPubkeyHex: string
  bootstrapRelay: string
}

export function loadConfig(): Config {
  const authorPubkeyHex = Deno.env.get('AUTHOR_PUBKEY_HEX')
  const bootstrapRelay = Deno.env.get('BOOTSTRAP_RELAY')
  if (!authorPubkeyHex) throw new Error('AUTHOR_PUBKEY_HEX fehlt in env')
  if (!/^[0-9a-f]{64}$/i.test(authorPubkeyHex)) {
    throw new Error('AUTHOR_PUBKEY_HEX muss 64 hex chars sein')
  }
  if (!bootstrapRelay) throw new Error('BOOTSTRAP_RELAY fehlt in env')
  return { authorPubkeyHex, bootstrapRelay }
}
```

- [ ] **Step 2.2.4: Test → muss passen**

Run: `cd snapshot && deno test tests/config.test.ts`
Expected: PASS, 3 Tests grün.

- [ ] **Step 2.2.5: Commit**

```bash
git add snapshot/src/core/config.ts snapshot/tests/config.test.ts
git commit -m "feat(snapshot): config-loader mit env-validierung

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.3: Dedup-by-d-tag mit Test

**Files:**
- Create: `snapshot/src/core/dedup.ts`
- Test: `snapshot/tests/dedup.test.ts`

- [ ] **Step 2.3.1: Failing Test**

```ts
// snapshot/tests/dedup.test.ts
import { assertEquals } from '@std/assert'
import { dedupByDtag } from '../src/core/dedup.ts'
import type { SignedEvent } from '../src/core/types.ts'

function ev(d: string, created_at: number, id: string): SignedEvent {
  return {
    id, pubkey: 'p', created_at, kind: 30023, sig: 's', content: '',
    tags: [['d', d]],
  }
}

Deno.test('dedupByDtag behaelt das neueste event pro d-tag', () => {
  const out = dedupByDtag([
    ev('a', 100, 'a-old'),
    ev('a', 200, 'a-new'),
    ev('b', 50, 'b-only'),
  ])
  const ids = out.map((e) => e.id).sort()
  assertEquals(ids, ['a-new', 'b-only'])
})

Deno.test('dedupByDtag laesst events ohne d-tag weg', () => {
  const out = dedupByDtag([
    { id: 'x', pubkey: 'p', created_at: 1, kind: 30023, sig: 's', content: '', tags: [] },
    ev('a', 1, 'a'),
  ])
  assertEquals(out.length, 1)
  assertEquals(out[0].id, 'a')
})
```

- [ ] **Step 2.3.2: Types-Modul anlegen**

```ts
// snapshot/src/core/types.ts
export interface SignedEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}
```

- [ ] **Step 2.3.3: Implementation**

```ts
// snapshot/src/core/dedup.ts
import type { SignedEvent } from './types.ts'

export function dedupByDtag(events: SignedEvent[]): SignedEvent[] {
  const byDtag = new Map<string, SignedEvent>()
  for (const ev of events) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) continue
    const existing = byDtag.get(d)
    if (!existing || ev.created_at > existing.created_at) {
      byDtag.set(d, ev)
    }
  }
  return [...byDtag.values()]
}
```

- [ ] **Step 2.3.4: Tests → grün**

Run: `cd snapshot && deno test tests/dedup.test.ts`
Expected: PASS, 2 Tests grün.

- [ ] **Step 2.3.5: Commit**

```bash
git add snapshot/src/core/types.ts snapshot/src/core/dedup.ts snapshot/tests/dedup.test.ts
git commit -m "feat(snapshot): dedup-by-d-tag

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.4: NIP-09-Filter mit Test

**Files:**
- Create: `snapshot/src/core/nip09-filter.ts`
- Test: `snapshot/tests/nip09-filter.test.ts`

- [ ] **Step 2.4.1: Failing Test**

```ts
// snapshot/tests/nip09-filter.test.ts
import { assertEquals } from '@std/assert'
import { filterDeleted } from '../src/core/nip09-filter.ts'
import type { SignedEvent } from '../src/core/types.ts'

function post(d: string, id: string): SignedEvent {
  return { id, pubkey: 'P', created_at: 1, kind: 30023, sig: 's', content: '', tags: [['d', d]] }
}
function deletion(coords: string[]): SignedEvent {
  return {
    id: 'del', pubkey: 'P', created_at: 2, kind: 5, sig: 's', content: '',
    tags: coords.map((c) => ['a', c]),
  }
}

Deno.test('filterDeleted entfernt events deren coord in einem kind:5 referenziert ist', () => {
  const out = filterDeleted(
    [post('alive', 'a'), post('dead', 'b')],
    [deletion(['30023:P:dead'])],
    'P',
  )
  assertEquals(out.map((e) => e.id), ['a'])
})

Deno.test('filterDeleted ignoriert kind:5 fremder pubkeys', () => {
  const fremde: SignedEvent = {
    ...deletion(['30023:P:alive']), pubkey: 'OTHER',
  }
  const out = filterDeleted([post('alive', 'a')], [fremde], 'P')
  assertEquals(out.length, 1)
})
```

- [ ] **Step 2.4.2: Implementation**

```ts
// snapshot/src/core/nip09-filter.ts
import type { SignedEvent } from './types.ts'

export function filterDeleted(
  events: SignedEvent[],
  deletions: SignedEvent[],
  authorPubkey: string,
): SignedEvent[] {
  const deletedCoords = new Set<string>()
  for (const del of deletions) {
    if (del.kind !== 5) continue
    if (del.pubkey !== authorPubkey) continue
    for (const tag of del.tags) {
      if (tag[0] === 'a' && tag[1]) deletedCoords.add(tag[1])
    }
  }
  return events.filter((ev) => {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) return true
    const coord = `${ev.kind}:${ev.pubkey}:${d}`
    return !deletedCoords.has(coord)
  })
}
```

- [ ] **Step 2.4.3: Tests → grün**

Run: `cd snapshot && deno test tests/nip09-filter.test.ts`
Expected: PASS, 2 Tests grün.

- [ ] **Step 2.4.4: Commit**

```bash
git add snapshot/src/core/nip09-filter.ts snapshot/tests/nip09-filter.test.ts
git commit -m "feat(snapshot): NIP-09-filter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.5: Plausibilitäts-Checks mit Test

**Files:**
- Create: `snapshot/src/core/checks.ts`
- Test: `snapshot/tests/checks.test.ts`

- [ ] **Step 2.5.1: Failing Test**

```ts
// snapshot/tests/checks.test.ts
import { assertEquals, assertThrows } from '@std/assert'
import { runChecks } from '../src/core/checks.ts'

Deno.test('runChecks: weniger als 60% relays geantwortet -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 5, relaysResponded: 2,
      eventCount: 27, minEvents: 1, lastKnownGoodCount: undefined,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'Relay-Quorum',
  )
})

Deno.test('runChecks: event-count unter min-events -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 5, relaysResponded: 5,
      eventCount: 0, minEvents: 1, lastKnownGoodCount: undefined,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'min-events',
  )
})

Deno.test('runChecks: drop > 20% ohne kind:5 -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 5, relaysResponded: 5,
      eventCount: 20, minEvents: 1, lastKnownGoodCount: 27,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'Event-Count-Drop',
  )
})

Deno.test('runChecks: drop > 20% mit korrespondierenden kind:5 -> ok', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5,
    eventCount: 20, minEvents: 1, lastKnownGoodCount: 27,
    newDeletionsCount: 7, allowShrink: false,
  })
})

Deno.test('runChecks: --allow-shrink umgeht drop-check', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5,
    eventCount: 1, minEvents: 1, lastKnownGoodCount: 27,
    newDeletionsCount: 0, allowShrink: true,
  })
})

Deno.test('runChecks: erstlauf ohne cache + min-events=1 -> ok', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5,
    eventCount: 1, minEvents: 1, lastKnownGoodCount: undefined,
    newDeletionsCount: 0, allowShrink: false,
  })
})
```

- [ ] **Step 2.5.2: Implementation**

```ts
// snapshot/src/core/checks.ts
export interface CheckInput {
  relaysQueried: number
  relaysResponded: number
  eventCount: number
  minEvents: number
  lastKnownGoodCount: number | undefined
  newDeletionsCount: number
  allowShrink: boolean
}

export function runChecks(input: CheckInput): void {
  const quorum = Math.ceil(input.relaysQueried * 0.6)
  if (input.relaysResponded < quorum) {
    throw new Error(
      `Relay-Quorum nicht erreicht: ${input.relaysResponded}/${input.relaysQueried} ` +
        `(brauche mindestens ${quorum})`,
    )
  }
  if (input.eventCount < input.minEvents) {
    throw new Error(
      `Event-Count ${input.eventCount} unter min-events ${input.minEvents}`,
    )
  }
  if (input.lastKnownGoodCount !== undefined && !input.allowShrink) {
    const drop = input.lastKnownGoodCount - input.eventCount
    const dropPct = drop / input.lastKnownGoodCount
    if (dropPct > 0.2 && drop > input.newDeletionsCount) {
      throw new Error(
        `Event-Count-Drop ${drop} (${(dropPct * 100).toFixed(0)}%) gegenueber ` +
          `last-known-good ${input.lastKnownGoodCount}, ` +
          `nur ${input.newDeletionsCount} korrespondierende kind:5. ` +
          `Override mit --allow-shrink falls bewusst.`,
      )
    }
  }
}
```

- [ ] **Step 2.5.3: Tests → grün**

Run: `cd snapshot && deno test tests/checks.test.ts`
Expected: PASS, 6 Tests grün.

- [ ] **Step 2.5.4: Commit**

```bash
git add snapshot/src/core/checks.ts snapshot/tests/checks.test.ts
git commit -m "feat(snapshot): plausibilitaets-checks (relay-quorum, drop, min-events)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.6: JSON-Builder pro Post mit Test

**Files:**
- Create: `snapshot/src/core/post-json.ts`
- Test: `snapshot/tests/post-json.test.ts`

- [ ] **Step 2.6.1: Failing Test**

```ts
// snapshot/tests/post-json.test.ts
import { assertEquals } from '@std/assert'
import { buildPostJson } from '../src/core/post-json.ts'
import type { SignedEvent } from '../src/core/types.ts'

const PUBKEY = '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41'

function buildEvent(opts: {
  d: string
  title: string
  summary?: string
  image?: string
  publishedAt?: number
  lang?: string
  tags?: string[]
  translationCoords?: string[]
  content: string
}): SignedEvent {
  const tags: string[][] = [['d', opts.d], ['title', opts.title]]
  if (opts.summary) tags.push(['summary', opts.summary])
  if (opts.image) tags.push(['image', opts.image])
  if (opts.publishedAt) tags.push(['published_at', String(opts.publishedAt)])
  if (opts.lang) {
    tags.push(['L', 'ISO-639-1'])
    tags.push(['l', opts.lang, 'ISO-639-1'])
  }
  for (const t of opts.tags ?? []) tags.push(['t', t])
  for (const c of opts.translationCoords ?? []) tags.push(['a', c, '', 'translation'])
  return {
    id: 'event-' + opts.d, pubkey: PUBKEY, created_at: 1700000000, kind: 30023,
    sig: 'sig', content: opts.content, tags,
  }
}

Deno.test('buildPostJson: vollstaendiges event', () => {
  const ev = buildEvent({
    d: 'bibel-selfies', title: 'Bibel-Selfies', summary: 'Kurz',
    image: 'https://blossom.edufeed.org/abc.jpg',
    publishedAt: 1699000000, lang: 'de', tags: ['Bibel'],
    translationCoords: [`30023:${PUBKEY}:bible-selfies`],
    content: '# body',
  })
  const titleByDtag = new Map([['bible-selfies', 'Bible-Selfies']])
  const json = buildPostJson(ev, titleByDtag)
  assertEquals(json.slug, 'bibel-selfies')
  assertEquals(json.title, 'Bibel-Selfies')
  assertEquals(json.summary, 'Kurz')
  assertEquals(json.lang, 'de')
  assertEquals(json.tags, ['Bibel'])
  assertEquals(json.published_at, 1699000000)
  assertEquals(json.cover_image?.url, 'https://blossom.edufeed.org/abc.jpg')
  assertEquals(json.translations, [
    { lang: 'en', slug: 'bible-selfies', title: 'Bible-Selfies' },
  ])
  assertEquals(json.content_markdown, '# body')
})

Deno.test('buildPostJson: fallback summary aus content', () => {
  const ev = buildEvent({
    d: 'no-summary', title: 'X', content: 'Lorem ipsum dolor sit amet.'.repeat(20),
  })
  const json = buildPostJson(ev, new Map())
  if (!json.summary) throw new Error('summary fehlt')
  if (json.summary.length > 220) throw new Error('summary zu lang')
  if (!json.summary.endsWith('…')) throw new Error('summary ohne ellipsis')
})

Deno.test('buildPostJson: fehlt published_at -> created_at', () => {
  const ev = buildEvent({ d: 'no-pub', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.published_at, 1700000000)
})

Deno.test('buildPostJson: fehlt image -> cover_image null', () => {
  const ev = buildEvent({ d: 'no-img', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.cover_image, null)
})

Deno.test('buildPostJson: lang default de wenn keine l-tags', () => {
  const ev = buildEvent({ d: 'no-lang', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.lang, 'de')
})
```

- [ ] **Step 2.6.2: Implementation**

```ts
// snapshot/src/core/post-json.ts
import { nip19 } from 'nostr-tools'
import type { SignedEvent } from './types.ts'

export interface CoverImage {
  url: string
  width?: number
  height?: number
  alt?: string
  mime?: string
}

export interface TranslationRef {
  lang: string
  slug: string
  title: string
}

export interface PostJson {
  slug: string
  event_id: string
  created_at: number
  published_at: number
  title: string
  summary: string
  lang: string
  cover_image: CoverImage | null
  content_markdown: string
  tags: string[]
  naddr: string
  habla_url: string
  translations: TranslationRef[]
}

const SUMMARY_MAX = 200

function tagValue(ev: SignedEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1]
}

function tagsAll(ev: SignedEvent, name: string): string[] {
  return ev.tags.filter((t) => t[0] === name).map((t) => t[1])
}

function deriveSummary(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim()
  if (flat.length <= SUMMARY_MAX) return flat
  const cut = flat.slice(0, SUMMARY_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > SUMMARY_MAX * 0.5 ? cut.slice(0, lastSpace) : cut
  return trimmed + '…'
}

export function buildPostJson(
  ev: SignedEvent,
  titleByDtag: Map<string, string>,
): PostJson {
  const slug = tagValue(ev, 'd') ?? ''
  const title = tagValue(ev, 'title') ?? ''
  const summaryTag = tagValue(ev, 'summary')
  const summary = summaryTag && summaryTag.length > 0 ? summaryTag : deriveSummary(ev.content)
  const image = tagValue(ev, 'image')
  const publishedAtRaw = tagValue(ev, 'published_at')
  const publishedAt = publishedAtRaw ? parseInt(publishedAtRaw, 10) : ev.created_at
  const lang = ev.tags.find((t) => t[0] === 'l' && t[2] === 'ISO-639-1')?.[1] ?? 'de'

  const cover_image: CoverImage | null = image
    ? { url: image, alt: title || undefined }
    : null

  const naddr = nip19.naddrEncode({
    kind: ev.kind,
    pubkey: ev.pubkey,
    identifier: slug,
  })

  const translations: TranslationRef[] = []
  for (const tag of ev.tags) {
    if (tag[0] !== 'a') continue
    if (tag[3] !== 'translation') continue
    const coord = tag[1]
    if (!coord) continue
    const parts = coord.split(':')
    if (parts.length !== 3) continue
    const otherSlug = parts[2]
    const otherTitle = titleByDtag.get(otherSlug) ?? otherSlug
    translations.push({
      lang: lang === 'de' ? 'en' : 'de',
      slug: otherSlug,
      title: otherTitle,
    })
  }

  return {
    slug,
    event_id: ev.id,
    created_at: ev.created_at,
    published_at: publishedAt,
    title,
    summary,
    lang,
    cover_image,
    content_markdown: ev.content,
    tags: tagsAll(ev, 't'),
    naddr,
    habla_url: `https://habla.news/a/${naddr}`,
    translations,
  }
}
```

- [ ] **Step 2.6.3: Tests → grün**

Run: `cd snapshot && deno test tests/post-json.test.ts`
Expected: PASS, 5 Tests grün.

- [ ] **Step 2.6.4: Commit**

```bash
git add snapshot/src/core/post-json.ts snapshot/tests/post-json.test.ts
git commit -m "feat(snapshot): post-json-builder mit fallback-summary

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.6.b: Cover-Image-HEAD-Probe

**Files:**
- Create: `snapshot/src/core/cover-probe.ts`
- Test: `snapshot/tests/cover-probe.test.ts`

Spec Algorithmus-Schritt 6: HEAD-Request auf den Cover-URL-Kandidaten; bei 200 als `url` schreiben, bei Fehler Warnung loggen + URL trotzdem schreiben (Blossom ist content-addressed, URL kommt zurück). Wir kapseln das als reine Funktion mit injizierbarem Fetch-Stub.

- [ ] **Step 2.6.b.1: Failing Test**

```ts
// snapshot/tests/cover-probe.test.ts
import { assertEquals } from '@std/assert'
import { probeCover, type HeadFetcher } from '../src/core/cover-probe.ts'

Deno.test('probeCover: 200 -> reachable=true', async () => {
  const fetcher: HeadFetcher = async () => ({ ok: true, status: 200 })
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: true, status: 200 })
})

Deno.test('probeCover: 404 -> reachable=false', async () => {
  const fetcher: HeadFetcher = async () => ({ ok: false, status: 404 })
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: false, status: 404 })
})

Deno.test('probeCover: network error -> reachable=false', async () => {
  const fetcher: HeadFetcher = async () => {
    throw new Error('ECONNREFUSED')
  }
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: false, status: 0 })
})
```

- [ ] **Step 2.6.b.2: Implementation**

```ts
// snapshot/src/core/cover-probe.ts
export interface ProbeResult {
  reachable: boolean
  status: number
}

export type HeadFetcher = (url: string) => Promise<{ ok: boolean; status: number }>

export const defaultHeadFetcher: HeadFetcher = async (url) => {
  const resp = await fetch(url, { method: 'HEAD' })
  return { ok: resp.ok, status: resp.status }
}

export async function probeCover(
  url: string,
  fetcher: HeadFetcher = defaultHeadFetcher,
): Promise<ProbeResult> {
  try {
    const r = await fetcher(url)
    return { reachable: r.ok, status: r.status }
  } catch {
    return { reachable: false, status: 0 }
  }
}
```

- [ ] **Step 2.6.b.3: Tests → grün**

Run: `cd snapshot && deno test tests/cover-probe.test.ts`
Expected: PASS, 3 Tests grün.

- [ ] **Step 2.6.b.4: CLI um Probe-Aufruf erweitern**

In `snapshot/src/cli.ts` nach dem `postJsons`-Build pro Post mit `cover_image`:

```ts
import { probeCover } from './core/cover-probe.ts'

// ... innerhalb main(), nach `const postJsons = filtered.map(...)`:
for (const p of postJsons) {
  if (!p.cover_image) continue
  const probe = await probeCover(p.cover_image.url)
  if (!probe.reachable) {
    console.warn(
      `snapshot: cover unreachable [${probe.status}] ${p.cover_image.url} (slug=${p.slug}) — URL wird trotzdem geschrieben`,
    )
  }
}
```

- [ ] **Step 2.6.b.5: Commit**

```bash
git add snapshot/src/core/cover-probe.ts snapshot/tests/cover-probe.test.ts snapshot/src/cli.ts
git commit -m "feat(snapshot): cover-image-HEAD-probe mit warnung bei unreachable

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.7: Cache-/Last-known-good-Modul

**Files:**
- Create: `snapshot/src/core/cache.ts`
- Test: `snapshot/tests/cache.test.ts`

- [ ] **Step 2.7.1: Failing Test**

```ts
// snapshot/tests/cache.test.ts
import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { readCache, writeCache, type CacheState } from '../src/core/cache.ts'

Deno.test('readCache: file fehlt -> undefined', async () => {
  const dir = await Deno.makeTempDir()
  const path = join(dir, 'cache.json')
  const cache = await readCache(path)
  assertEquals(cache, undefined)
})

Deno.test('writeCache + readCache: round-trip', async () => {
  const dir = await Deno.makeTempDir()
  const path = join(dir, 'cache.json')
  const state: CacheState = { lastKnownGoodCount: 27, deletedCoords: ['30023:P:dead'] }
  await writeCache(path, state)
  const out = await readCache(path)
  assertEquals(out, state)
})
```

- [ ] **Step 2.7.2: Implementation**

```ts
// snapshot/src/core/cache.ts
export interface CacheState {
  lastKnownGoodCount: number
  deletedCoords: string[]
}

export async function readCache(path: string): Promise<CacheState | undefined> {
  try {
    const text = await Deno.readTextFile(path)
    return JSON.parse(text) as CacheState
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return undefined
    throw err
  }
}

export async function writeCache(path: string, state: CacheState): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(state, null, 2) + '\n')
}
```

- [ ] **Step 2.7.3: Tests → grün**

Run: `cd snapshot && deno test tests/cache.test.ts`
Expected: PASS, 2 Tests grün.

- [ ] **Step 2.7.4: Commit**

```bash
git add snapshot/src/core/cache.ts snapshot/tests/cache.test.ts
git commit -m "feat(snapshot): cache-state fuer last-known-good

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.8: Output-Writer (index.json + posts/<slug>.json)

**Files:**
- Create: `snapshot/src/core/output.ts`
- Test: `snapshot/tests/output.test.ts`

- [ ] **Step 2.8.1: Failing Test**

```ts
// snapshot/tests/output.test.ts
import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { writeOutput } from '../src/core/output.ts'
import type { PostJson } from '../src/core/post-json.ts'

const samplePost: PostJson = {
  slug: 'a', event_id: 'e1', created_at: 1, published_at: 1,
  title: 'A', summary: 's', lang: 'de', cover_image: null,
  content_markdown: '# A', tags: [], naddr: 'naddr1', habla_url: 'https://habla.news/a/naddr1',
  translations: [],
}

Deno.test('writeOutput schreibt index.json + posts/<slug>.json', async () => {
  const dir = await Deno.makeTempDir()
  await writeOutput(dir, {
    generatedAt: '2026-04-28T10:00:00Z',
    authorPubkey: 'P',
    relaysQueried: ['wss://r1', 'wss://r2'],
    relaysResponded: ['wss://r1'],
    posts: [samplePost],
  })

  const indexText = await Deno.readTextFile(join(dir, 'index.json'))
  const index = JSON.parse(indexText)
  assertEquals(index.author_pubkey, 'P')
  assertEquals(index.post_count, 1)
  assertEquals(index.posts.length, 1)
  assertEquals(index.posts[0].slug, 'a')
  assertEquals(index.posts[0].title, 'A')
  assertEquals(index.posts[0].lang, 'de')

  const postText = await Deno.readTextFile(join(dir, 'posts', 'a.json'))
  const post = JSON.parse(postText)
  assertEquals(post.slug, 'a')
  assertEquals(post.content_markdown, '# A')
})
```

- [ ] **Step 2.8.2: Implementation**

```ts
// snapshot/src/core/output.ts
import { ensureDir } from '@std/fs'
import { join } from '@std/path'
import type { PostJson } from './post-json.ts'

export interface OutputInput {
  generatedAt: string
  authorPubkey: string
  relaysQueried: string[]
  relaysResponded: string[]
  posts: PostJson[]
}

export async function writeOutput(outDir: string, input: OutputInput): Promise<void> {
  await ensureDir(outDir)
  await ensureDir(join(outDir, 'posts'))

  const index = {
    generated_at: input.generatedAt,
    author_pubkey: input.authorPubkey,
    relays_queried: input.relaysQueried,
    relays_responded: input.relaysResponded,
    post_count: input.posts.length,
    posts: input.posts.map((p) => ({
      slug: p.slug,
      lang: p.lang,
      created_at: p.created_at,
      title: p.title,
    })),
  }
  await Deno.writeTextFile(
    join(outDir, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
  )

  for (const post of input.posts) {
    await Deno.writeTextFile(
      join(outDir, 'posts', `${post.slug}.json`),
      JSON.stringify(post, null, 2) + '\n',
    )
  }
}
```

- [ ] **Step 2.8.3: Tests → grün**

Run: `cd snapshot && deno test tests/output.test.ts`
Expected: PASS.

- [ ] **Step 2.8.4: Commit**

```bash
git add snapshot/src/core/output.ts snapshot/tests/output.test.ts
git commit -m "feat(snapshot): output-writer (index.json + posts/<slug>.json)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.9: Relay-Loader (Bootstrap + Event-Fetch)

**Files:**
- Create: `snapshot/src/core/relays.ts`
- Test: `snapshot/tests/relays.test.ts`

Diese Schicht hat einen echten externen Bestandteil (Relay-Verbindung). Wir testen nur die Logik, die den Pool orchestriert — die Pool-Calls werden via injizierter Funktion gestubbt.

- [ ] **Step 2.9.1: Failing Test**

```ts
// snapshot/tests/relays.test.ts
import { assertEquals } from '@std/assert'
import { extractReadRelays, type RelayListLoader, loadReadRelays } from '../src/core/relays.ts'
import type { SignedEvent } from '../src/core/types.ts'

const KIND_10002: SignedEvent = {
  id: 'r', pubkey: 'P', created_at: 1, kind: 10002, sig: 's', content: '',
  tags: [
    ['r', 'wss://relay.damus.io'],
    ['r', 'wss://nos.lol', 'read'],
    ['r', 'wss://relay.write-only.example', 'write'],
  ],
}

Deno.test('extractReadRelays: ohne marker = read+write, "read" = read, "write" = nicht', () => {
  assertEquals(extractReadRelays(KIND_10002), [
    'wss://relay.damus.io',
    'wss://nos.lol',
  ])
})

Deno.test('loadReadRelays: nutzt fallback wenn kein kind:10002', async () => {
  const loader: RelayListLoader = async () => undefined
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, [
    'wss://fallback1', 'wss://fallback2',
  ])
  assertEquals(relays, ['wss://fallback1', 'wss://fallback2'])
})

Deno.test('loadReadRelays: nutzt kind:10002 wenn vorhanden', async () => {
  const loader: RelayListLoader = async () => KIND_10002
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, ['wss://fallback'])
  assertEquals(relays, ['wss://relay.damus.io', 'wss://nos.lol'])
})
```

- [ ] **Step 2.9.2: Implementation**

```ts
// snapshot/src/core/relays.ts
import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './types.ts'

export type RelayListLoader = (
  bootstrapRelay: string,
  authorPubkey: string,
) => Promise<SignedEvent | undefined>

export const FALLBACK_READ_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
]

export function extractReadRelays(kind10002: SignedEvent): string[] {
  const out: string[] = []
  for (const tag of kind10002.tags) {
    if (tag[0] !== 'r' || !tag[1]) continue
    const marker = tag[2]
    if (marker === 'write') continue
    out.push(tag[1])
  }
  return out
}

export const defaultRelayListLoader: RelayListLoader = async (bootstrap, pubkey) => {
  try {
    const relay = new Relay(bootstrap)
    const ev = await firstValueFrom(
      relay.request({ kinds: [10002], authors: [pubkey], limit: 1 })
        .pipe(timeout({ first: 5_000 })),
    )
    return ev as SignedEvent
  } catch {
    return undefined
  }
}

export async function loadReadRelays(
  bootstrapRelay: string,
  authorPubkey: string,
  loader: RelayListLoader = defaultRelayListLoader,
  fallback: string[] = FALLBACK_READ_RELAYS,
): Promise<string[]> {
  const ev = await loader(bootstrapRelay, authorPubkey)
  if (!ev) return fallback
  const list = extractReadRelays(ev)
  return list.length > 0 ? list : fallback
}

export interface FetchEventsResult {
  events: SignedEvent[]
  responded: string[]
  queried: string[]
}

export type EventFetcher = (relay: string, pubkey: string) => Promise<SignedEvent[]>

export const defaultEventFetcher: EventFetcher = async (relay, pubkey) => {
  const out: SignedEvent[] = []
  const r = new Relay(relay)
  return await new Promise<SignedEvent[]>((resolve) => {
    const sub = r.request({ kinds: [30023, 5], authors: [pubkey] })
      .pipe(timeout({ first: 10_000 }))
      .subscribe({
        next: (ev) => out.push(ev as SignedEvent),
        error: () => resolve(out),
        complete: () => resolve(out),
      })
    setTimeout(() => sub.unsubscribe(), 11_000)
  })
}

export async function fetchEvents(
  relays: string[],
  authorPubkey: string,
  fetcher: EventFetcher = defaultEventFetcher,
): Promise<FetchEventsResult> {
  const results = await Promise.all(
    relays.map(async (url) => {
      try {
        const events = await fetcher(url, authorPubkey)
        return { url, ok: true as const, events }
      } catch {
        return { url, ok: false as const, events: [] as SignedEvent[] }
      }
    }),
  )
  const events: SignedEvent[] = []
  for (const r of results) events.push(...r.events)
  return {
    events,
    responded: results.filter((r) => r.ok).map((r) => r.url),
    queried: relays,
  }
}
```

- [ ] **Step 2.9.3: Tests → grün**

Run: `cd snapshot && deno test tests/relays.test.ts`
Expected: PASS, 3 Tests grün.

- [ ] **Step 2.9.4: Commit**

```bash
git add snapshot/src/core/relays.ts snapshot/tests/relays.test.ts
git commit -m "feat(snapshot): relay-loader (kind:10002 + event-fetch)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.10: CLI-Entrypoint

**Files:**
- Create: `snapshot/src/cli.ts`

CLI verdrahtet alle Module. Wir testen kein CLI-Parsing — das ist `@std/cli`-Standard. Stattdessen nutzen wir die End-to-End-Verifikation in Task 2.11.

- [ ] **Step 2.10.1: Implementation**

```ts
// snapshot/src/cli.ts
import { parseArgs } from '@std/cli'
import { join, resolve } from '@std/path'
import { loadConfig } from './core/config.ts'
import { loadReadRelays, fetchEvents } from './core/relays.ts'
import { dedupByDtag } from './core/dedup.ts'
import { filterDeleted } from './core/nip09-filter.ts'
import { runChecks } from './core/checks.ts'
import { buildPostJson } from './core/post-json.ts'
import { writeOutput } from './core/output.ts'
import { readCache, writeCache, type CacheState } from './core/cache.ts'
import type { SignedEvent } from './core/types.ts'

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    string: ['out', 'cache', 'min-events'],
    boolean: ['allow-shrink'],
    default: {
      out: resolve(import.meta.dirname!, '../output'),
    },
  })
  const outDir = String(args.out)
  const cachePath = args.cache ? String(args.cache) : join(outDir, '.last-snapshot.json')
  const allowShrink = args['allow-shrink'] === true

  const cfg = loadConfig()
  const cache = await readCache(cachePath)
  const minEvents = args['min-events']
    ? parseInt(String(args['min-events']), 10)
    : cache
      ? Math.max(1, cache.lastKnownGoodCount - 2)
      : 1

  console.log('snapshot: bootstrap relay =', cfg.bootstrapRelay)
  const readRelays = await loadReadRelays(cfg.bootstrapRelay, cfg.authorPubkeyHex)
  console.log('snapshot: read relays =', readRelays.join(', '))

  const fetched = await fetchEvents(readRelays, cfg.authorPubkeyHex)
  console.log(
    `snapshot: ${fetched.responded.length}/${fetched.queried.length} relays geantwortet, ` +
      `${fetched.events.length} events roh`,
  )

  const posts: SignedEvent[] = []
  const deletions: SignedEvent[] = []
  for (const ev of fetched.events) {
    if (ev.kind === 30023) posts.push(ev)
    else if (ev.kind === 5) deletions.push(ev)
  }

  const dedupedPosts = dedupByDtag(posts)
  const filtered = filterDeleted(dedupedPosts, deletions, cfg.authorPubkeyHex)

  const previousDeletedCoords = new Set(cache?.deletedCoords ?? [])
  const newlyDeletedCount = deletions.flatMap((d) =>
    d.tags.filter((t) => t[0] === 'a' && t[1] && !previousDeletedCoords.has(t[1])).map((t) => t[1])
  ).length

  runChecks({
    relaysQueried: fetched.queried.length,
    relaysResponded: fetched.responded.length,
    eventCount: filtered.length,
    minEvents,
    lastKnownGoodCount: cache?.lastKnownGoodCount,
    newDeletionsCount: newlyDeletedCount,
    allowShrink,
  })

  const titleByDtag = new Map<string, string>()
  for (const ev of filtered) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    const title = ev.tags.find((t) => t[0] === 'title')?.[1]
    if (d && title) titleByDtag.set(d, title)
  }
  const postJsons = filtered.map((ev) => buildPostJson(ev, titleByDtag))

  await writeOutput(outDir, {
    generatedAt: new Date().toISOString(),
    authorPubkey: cfg.authorPubkeyHex,
    relaysQueried: fetched.queried,
    relaysResponded: fetched.responded,
    posts: postJsons,
  })

  const allDeletedCoords = deletions.flatMap((d) =>
    d.tags.filter((t) => t[0] === 'a' && t[1]).map((t) => t[1] as string)
  )
  const newCache: CacheState = {
    lastKnownGoodCount: filtered.length,
    deletedCoords: [...new Set(allDeletedCoords)],
  }
  await writeCache(cachePath, newCache)

  console.log(`snapshot: ${filtered.length} posts geschrieben nach ${outDir}`)
  return 0
}

if (import.meta.main) {
  try {
    Deno.exit(await main())
  } catch (err) {
    console.error('snapshot: HARD-FAIL —', err instanceof Error ? err.message : String(err))
    Deno.exit(1)
  }
}
```

- [ ] **Step 2.10.2: Type-Check**

Run: `cd snapshot && deno check src/cli.ts`
Expected: 0 errors.

- [ ] **Step 2.10.3: Commit**

```bash
git add snapshot/src/cli.ts
git commit -m "feat(snapshot): cli-entrypoint

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.11: End-to-End Smoke-Run gegen echte Relays

**Files:** keine

- [ ] **Step 2.11.1: Snapshot ausführen**

```bash
cd snapshot && deno task snapshot
```

Erwartung:
- Console-Output zeigt 5/5 Relays geantwortet.
- 27 (oder mehr) Posts gefunden.
- `snapshot/output/index.json` existiert mit `post_count >= 27`.
- `snapshot/output/posts/bibel-selfies.json` existiert mit `lang: "de"` und einer `translations[]`-Liste, die `bible-selfies` enthält.
- `snapshot/output/.last-snapshot.json` existiert.

- [ ] **Step 2.11.2: Spot-Checks**

```bash
cd snapshot
jq '.post_count, .posts[0]' output/index.json
jq '.title, .lang, .translations' output/posts/bibel-selfies.json
jq '.title, .lang, .translations' output/posts/bible-selfies.json
```

Erwartung:
- Beide Sprachvarianten verweisen wechselseitig aufeinander.
- DE-Post hat `lang: "de"`, EN-Post hat `lang: "en"`.

- [ ] **Step 2.11.3: Commit "snapshot output ist nicht im Repo"**

`output/` ist via `.gitignore` ausgeschlossen — nichts zu committen.

---

## Etappe 3 — Snapshot in CI

### Task 3.1: Workflow-Datei erweitern

**Files:**
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 3.1.1: Aktuellen Workflow lesen**

```bash
cat .github/workflows/publish.yml
```

- [ ] **Step 3.1.2: Snapshot-Job ergänzen**

Den existierenden Workflow um einen `snapshot`-Step erweitern, der **vor** dem SvelteKit-Build läuft. Konkrete YAML-Syntax orientiert sich am bestehenden Workflow — nach dem `publish`-Step kommt:

```yaml
      - name: Run snapshot
        working-directory: snapshot
        env:
          AUTHOR_PUBKEY_HEX: ${{ secrets.AUTHOR_PUBKEY_HEX }}
          BOOTSTRAP_RELAY: wss://relay.primal.net
        run: deno task snapshot
```

(Die Build/Deploy-Etappen folgen erst in Etappe 4 — in diesem Schritt erzeugen wir nur den Snapshot, das Output verbleibt im CI-Artefakt-Cache, beeinflusst die SPA noch nicht.)

- [ ] **Step 3.1.3: Workflow-Lint mit actionlint (falls verfügbar)**

```bash
which actionlint && actionlint .github/workflows/publish.yml || echo "actionlint nicht installiert — manuelle YAML-Validierung"
```

Wenn nicht verfügbar: YAML-Indent händisch prüfen.

- [ ] **Step 3.1.4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: snapshot-job vor svelte-build

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3.1.5: Push + Action-Run prüfen**

```bash
git push origin main
gh run watch
```

Erwartung: Snapshot-Step grün, Output-Statistik im Log sichtbar.

---

## Etappe 4 — Detail-Route auf Prerender umstellen

In dieser Etappe wird die SPA umgebaut: `[...slug]/+page.ts` lädt aus Snapshot-JSON, `+page.svelte` rendert daraus, `<svelte:head>` setzt OG-Tags, der Runtime-Fallback bleibt für Slugs außerhalb des Snapshots erhalten.

### Task 4.1: SSR + Prerender für Detail-Route aktivieren

**Files:**
- Create: `app/src/routes/[...slug]/+page.ts` (rewrite)

Hinweis: `+layout.ts` hat global `ssr = false`. Pro-Route-Override durch lokale Page-Optionen.

- [ ] **Step 4.1.1: `+page.ts` umschreiben**

Komplette neue Fassung:

```ts
import { error, redirect } from '@sveltejs/kit'
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy'
import type { EntryGenerator, PageLoad } from './$types'
import { browser } from '$app/environment'

export const ssr = true
export const prerender = true
export const trailingSlash = 'always'

interface SnapshotIndex {
  posts: Array<{ slug: string; lang: string; title: string }>
}

interface PostJson {
  slug: string
  event_id: string
  created_at: number
  published_at: number
  title: string
  summary: string
  lang: string
  cover_image: { url: string; alt?: string; width?: number; height?: number; mime?: string } | null
  content_markdown: string
  tags: string[]
  naddr: string
  habla_url: string
  translations: Array<{ lang: string; slug: string; title: string }>
}

let cachedIndex: SnapshotIndex | undefined
async function readIndex(): Promise<SnapshotIndex> {
  if (cachedIndex) return cachedIndex
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const dir = path.resolve('../snapshot/output')
  const text = await fs.readFile(path.join(dir, 'index.json'), 'utf-8')
  cachedIndex = JSON.parse(text) as SnapshotIndex
  return cachedIndex
}

async function readPost(slug: string): Promise<PostJson | undefined> {
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const dir = path.resolve('../snapshot/output')
    const text = await fs.readFile(path.join(dir, 'posts', `${slug}.json`), 'utf-8')
    return JSON.parse(text) as PostJson
  } catch {
    return undefined
  }
}

export const entries: EntryGenerator = async () => {
  const idx = await readIndex()
  return idx.posts.map((p) => ({ slug: p.slug }))
}

export const load: PageLoad = async ({ url }) => {
  const pathname = url.pathname

  const legacyDtag = parseLegacyUrl(pathname)
  if (legacyDtag) {
    throw redirect(301, canonicalPostPath(legacyDtag))
  }

  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments.length !== 1 || !segments[0]) {
    throw error(404, 'Seite nicht gefunden')
  }
  const dtag = decodeURIComponent(segments[0])

  if (!browser) {
    const snapshot = await readPost(dtag)
    if (snapshot) return { dtag, snapshot }
  }

  return { dtag, snapshot: null }
}
```

Begründung des `browser`-Guards: Während des Builds läuft `load` in Node und liest aus `snapshot/output/`. Im Browser (Runtime-Hydration für nicht-prerenderte Slugs) gibt's kein Snapshot, dort fällt `data.snapshot` auf `null`, und `+page.svelte` lädt via Runtime-Relay-Fetch.

- [ ] **Step 4.1.2: Type-Check**

Run: `cd app && npm run check`
Expected: 0 errors.

- [ ] **Step 4.1.3: Commit**

```bash
git add app/src/routes/[\.\.\.slug]/+page.ts
git commit -m "feat(spa): detail-route auf prerender + ssr=true

Lokaler override des global ssr=false. entries() liest aus
snapshot/output/index.json, load() pro-slug aus posts/<slug>.json.
runtime-fallback bleibt fuer slugs ausserhalb des snapshots.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4.2: `+page.svelte` mit Snapshot-Rendering und OG-Tags

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`

- [ ] **Step 4.2.1: Komplette neue Fassung schreiben**

```svelte
<script lang="ts">
  import type { NostrEvent } from '$lib/nostr/loaders'
  import { loadPost } from '$lib/nostr/loaders'
  import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config'
  import { buildHablaLink } from '$lib/nostr/naddr'
  import PostView from '$lib/components/PostView.svelte'
  import LoadingOrError from '$lib/components/LoadingOrError.svelte'
  import { renderMarkdown } from '$lib/render/markdown'
  import { t } from '$lib/i18n'
  import { get } from 'svelte/store'
  import { onMount } from 'svelte'

  let { data } = $props()
  const dtag = $derived(data.dtag)
  const snapshot = $derived(data.snapshot)

  let post: NostrEvent | null = $state(null)
  let loading = $state(false)
  let error: string | null = $state(null)

  const hablaLink = $derived(
    buildHablaLink({
      pubkey: AUTHOR_PUBKEY_HEX,
      kind: 30023,
      identifier: dtag,
    }),
  )

  const siteUrl = '__SITE_URL__'
  const canonical = $derived(`${siteUrl}/${snapshot?.slug ?? dtag}/`)
  const ogImage = $derived(
    snapshot?.cover_image?.url ?? `${siteUrl}/joerg-profil-2024.webp`,
  )
  const ogImageAlt = $derived(
    snapshot?.cover_image?.alt ?? snapshot?.title ?? 'Jörg Lohrer',
  )
  const bodyHtmlPrerendered = $derived(
    snapshot ? renderMarkdown(snapshot.content_markdown) : '',
  )

  onMount(() => {
    if (snapshot) return
    loading = true
    const currentDtag = dtag
    loadPost(currentDtag)
      .then((p) => {
        if (currentDtag !== dtag) return
        if (!p) error = get(t)('post.not_found', { values: { slug: currentDtag } })
        else post = p
      })
      .catch((e) => {
        if (currentDtag !== dtag) return
        error = e instanceof Error ? e.message : get(t)('post.unknown_error')
      })
      .finally(() => {
        if (currentDtag === dtag) loading = false
      })
  })

  const jsonLd = $derived(
    snapshot
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: snapshot.title,
          description: snapshot.summary,
          datePublished: new Date(snapshot.published_at * 1000).toISOString(),
          dateModified: new Date(snapshot.created_at * 1000).toISOString(),
          author: { '@type': 'Person', name: 'Jörg Lohrer' },
          inLanguage: snapshot.lang,
          image: ogImage,
          mainEntityOfPage: canonical,
        })
      : '',
  )
</script>

{#if snapshot}
  <svelte:head>
    <title>{snapshot.title} – Jörg Lohrer</title>
    <meta name="description" content={snapshot.summary} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="article" />
    <meta property="og:title" content={snapshot.title} />
    <meta property="og:description" content={snapshot.summary} />
    <meta property="og:url" content={canonical} />
    <meta property="og:locale" content={snapshot.lang === 'de' ? 'de_DE' : 'en_US'} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:alt" content={ogImageAlt} />
    {#if snapshot.cover_image?.width}
      <meta property="og:image:width" content={String(snapshot.cover_image.width)} />
    {/if}
    {#if snapshot.cover_image?.height}
      <meta property="og:image:height" content={String(snapshot.cover_image.height)} />
    {/if}
    <meta property="article:published_time" content={new Date(snapshot.published_at * 1000).toISOString()} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={snapshot.title} />
    <meta name="twitter:description" content={snapshot.summary} />
    <meta name="twitter:image" content={ogImage} />
    {#each snapshot.translations as alt}
      <link rel="alternate" hreflang={alt.lang} href={`${siteUrl}/${alt.slug}/`} />
    {/each}
    <link rel="alternate" hreflang="x-default" href={canonical} />
    {@html `<script type="application/ld+json">${jsonLd}</script>`}
  </svelte:head>
{/if}

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

{#if snapshot}
  <article class="post">
    <h1 class="post-title">{snapshot.title}</h1>
    {#if snapshot.cover_image}
      <p class="cover">
        <img src={snapshot.cover_image.url} alt={snapshot.cover_image.alt ?? ''} />
      </p>
    {/if}
    {#if snapshot.summary}
      <p class="summary">{snapshot.summary}</p>
    {/if}
    <div class="body">{@html bodyHtmlPrerendered}</div>
  </article>
{:else}
  <LoadingOrError {loading} {error} {hablaLink} />
  {#if post}
    <PostView event={post} />
  {/if}
{/if}

<style>
  .breadcrumb {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .breadcrumb a {
    color: var(--accent);
    text-decoration: none;
  }
  .breadcrumb a:hover {
    text-decoration: underline;
  }
  .post-title {
    font-size: 1.5rem;
    line-height: 1.25;
    margin: 0 0 0.4rem;
    word-wrap: break-word;
  }
  @media (min-width: 640px) {
    .post-title {
      font-size: 2rem;
      line-height: 1.2;
    }
  }
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
  .summary {
    font-style: italic;
    color: var(--muted);
  }
  .body :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  .body :global(a) {
    color: var(--accent);
    word-break: break-word;
  }
  .body :global(pre) {
    background: var(--code-bg);
    padding: 0.8rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.88em;
    max-width: 100%;
  }
  .body :global(code) {
    background: var(--code-bg);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.92em;
    word-break: break-word;
  }
  .body :global(pre code) {
    padding: 0;
    background: none;
    word-break: normal;
  }
  .body :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
  }
  .body :global(blockquote) {
    border-left: 3px solid var(--border);
    padding: 0 0 0 1rem;
    margin: 1rem 0;
    color: var(--muted);
  }
</style>
```

Diese Fassung rendert auf Prerender-Pfad direkt aus dem Snapshot (inklusive `<svelte:head>` mit OG/Twitter/JSON-LD/hreflang) und fällt für Slugs ohne Snapshot zurück auf die alte `loadPost`+`PostView`-Logik. Reactions/Replies kommen in Task 4.3.

- [ ] **Step 4.2.2: Type-Check**

Run: `cd app && npm run check`
Expected: 0 errors.

- [ ] **Step 4.2.3: Commit**

```bash
git add 'app/src/routes/[...slug]/+page.svelte'
git commit -m "feat(spa): post-detail rendert prerendered aus snapshot

Snapshot-pfad: page+head komplett aus json, mit og/twitter/jsonld/hreflang.
Runtime-fallback: falls data.snapshot null, loadPost+PostView wie bisher.
Reactions/replies kommen im naechsten task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4.3: Reactions, Replies, Sprach-Switcher auf Snapshot-Pfad

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`

Snapshot-Pfad braucht weiterhin Reactions, Replies, Sprach-Switcher. Diese Komponenten existieren als wiederverwendbare Bausteine (`Reactions.svelte`, `ReplyComposer.svelte`, `ReplyList.svelte`, `LanguageAvailability.svelte`, `ExternalClientLinks.svelte`) und brauchen unterschiedliche Inputs.

- [ ] **Step 4.3.1: Snapshot-Pfad um interaktive Komponenten erweitern**

Im snapshot-Block der `+page.svelte` (innerhalb `{#if snapshot}` `<article>...</article>`) nach `<div class="body">{@html bodyHtmlPrerendered}</div>` einfügen — und die nötigen Imports oben ergänzen (`Reactions`, `ReplyComposer`, `ReplyList`, `ExternalClientLinks`, sowie `SignedEvent` für die optimistische Reply-Liste; `LanguageAvailability` braucht ein `NostrEvent` und passt darum nicht direkt — Snapshot-Pfad rendert den Switcher inline aus `snapshot.translations`):

```svelte
    {#if snapshot.translations.length > 0}
      <p class="lang-switch">
        {$t(snapshot.lang === 'de' ? 'lang_switch.also_in_en' : 'lang_switch.also_in_de')}
        {#each snapshot.translations as alt}
          <a href={`/${alt.slug}/`}>{alt.title}</a>
        {/each}
      </p>
    {/if}
    {#if snapshot.tags.length > 0}
      <div class="tags">
        {#each snapshot.tags as tag}
          <a class="tag" href={`/tag/${encodeURIComponent(tag)}/`}>{tag}</a>
        {/each}
      </div>
    {/if}
    <Reactions dtag={snapshot.slug} />
    <ExternalClientLinks dtag={snapshot.slug} />
    <ReplyComposer dtag={snapshot.slug} eventId={snapshot.event_id} onPublished={handlePublished} />
    <ReplyList dtag={snapshot.slug} optimistic={optimisticReplies} />
```

Imports ganz oben ergänzen:

```svelte
  import Reactions from '$lib/components/Reactions.svelte'
  import ReplyList from '$lib/components/ReplyList.svelte'
  import ReplyComposer from '$lib/components/ReplyComposer.svelte'
  import ExternalClientLinks from '$lib/components/ExternalClientLinks.svelte'
  import type { SignedEvent } from '$lib/nostr/signer'

  let optimisticReplies: NostrEvent[] = $state([])
  function handlePublished(signed: SignedEvent) {
    optimisticReplies = [...optimisticReplies, signed as unknown as NostrEvent]
  }
```

I18n-Keys, die hinzukommen:
- `lang_switch.also_in_en` (DE: „Auch auf Englisch verfügbar:")
- `lang_switch.also_in_de` (EN: „Also available in German:")

- [ ] **Step 4.3.2: i18n-Messages ergänzen**

Files: `app/src/lib/i18n/messages/de.json`, `app/src/lib/i18n/messages/en.json`

DE-File: Eintrag unter `lang_switch` ergänzen:

```json
"lang_switch": {
  "also_in_en": "Auch auf Englisch verfügbar:",
  "also_in_de": "Also available in German:"
}
```

EN-File analog (Werte gleich, Key-Struktur gleich).

Hinweis: existierende `lang_switch`-Keys (z.B. `also_in_en`/`also_in_de` aus `LanguageAvailability`) — bevor neu anlegen, prüfen, ob die Strings unter den Namen schon existieren. In dem Fall den existierenden Key wiederverwenden, keine Duplikate.

```bash
grep -A 5 'lang_switch' app/src/lib/i18n/messages/de.json
```

- [ ] **Step 4.3.3: Type-Check**

Run: `cd app && npm run check`
Expected: 0 errors.

- [ ] **Step 4.3.4: Build lokal testen**

```bash
cd snapshot && deno task snapshot
cd ../app && npm run build
ls build | head -20
ls build/bibel-selfies/index.html
grep -o 'og:title[^<]*' build/bibel-selfies/index.html
grep -o 'og:image[^<]*' build/bibel-selfies/index.html
grep -o 'application/ld+json[^<]*' build/bibel-selfies/index.html
```

Erwartung:
- `build/<slug>/index.html` für jeden Snapshot-Slug existiert.
- OG-Tags und JSON-LD im HTML enthalten.
- Keine Build-Fehler.

- [ ] **Step 4.3.5: Dev-Server smoke-test**

```bash
cd app && npm run dev &
sleep 3
curl -s http://localhost:5173/bibel-selfies/ | head -20
kill %1
```

Erwartung: HTML-Ausgabe, kein 500.

- [ ] **Step 4.3.6: Commit**

```bash
git add 'app/src/routes/[...slug]/+page.svelte' app/src/lib/i18n/messages/
git commit -m "feat(spa): snapshot-pfad mit reactions/replies/langs/tags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4.4: Hosting-Test auf svelte.joerg-lohrer.de

**Files:** keine

- [ ] **Step 4.4.1: Snapshot lokal frisch ziehen**

```bash
cd snapshot && deno task snapshot
```

- [ ] **Step 4.4.2: Deploy auf Entwicklungs-Subdomain**

```bash
DEPLOY_TARGET=svelte ./scripts/deploy-svelte.sh
```

- [ ] **Step 4.4.3: Live-Verifikation**

```bash
curl -s https://svelte.joerg-lohrer.de/bibel-selfies/ | grep -o 'og:title[^<]*'
curl -s https://svelte.joerg-lohrer.de/bibel-selfies/ | grep -o 'og:image[^<]*'
curl -s https://svelte.joerg-lohrer.de/bibel-selfies/ | grep -c 'application/ld+json'
```

Erwartung:
- OG-Tags mit korrektem Titel.
- `og:image` zeigt auf Blossom oder Site-Default.
- Genau 1 JSON-LD-Block.

- [ ] **Step 4.4.4: Browser-Smoke-Test**

Manuell https://svelte.joerg-lohrer.de/bibel-selfies/ im Browser öffnen, prüfen:
- Post wird angezeigt.
- Reactions, Replies, Sprach-Switcher funktionieren (= clientseitige Hydration läuft).
- Browser-Tab-Title stimmt.
- View-Source zeigt vollständigen Post-Body als HTML (= Crawler bekommt das gleiche).

- [ ] **Step 4.4.5: Wenn alles ok — Push für CI**

```bash
git push origin main
gh run watch
```

Erwartung: Action grün, Snapshot+Build+Deploy auf prod-target durchgelaufen.

---

## Etappe 5 — Runtime-Relay-Fetch in Detail-Route entfernen

Wenn Etappe 4 stabil ist, entfernen wir den Fallback-Pfad. Detail-Seite lebt dann ausschließlich vom Snapshot. Frische Nostr-first-Posts brauchen einen neuen Snapshot+Build, um zu erscheinen.

### Task 5.1: Fallback-Pfad ausbauen

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`
- Modify: `app/src/routes/[...slug]/+page.ts`

- [ ] **Step 5.1.1: `+page.ts` — 404 für unbekannte Slugs**

Komplettersatz für `load`:

```ts
export const load: PageLoad = async ({ url }) => {
  const pathname = url.pathname

  const legacyDtag = parseLegacyUrl(pathname)
  if (legacyDtag) {
    throw redirect(301, canonicalPostPath(legacyDtag))
  }

  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments.length !== 1 || !segments[0]) {
    throw error(404, 'Seite nicht gefunden')
  }
  const dtag = decodeURIComponent(segments[0])

  if (!browser) {
    const snapshot = await readPost(dtag)
    if (!snapshot) throw error(404, 'Post nicht gefunden')
    return { dtag, snapshot }
  }

  throw error(404, 'Post nicht gefunden')
}
```

- [ ] **Step 5.1.2: `+page.svelte` — Fallback-Pfad weg**

Im `<script>`: `loadPost`, `PostView`, `LoadingOrError`, `loading`, `error`, `post`, `onMount`, `hablaLink`, `t`, `get` Imports und State entfernen.

Im Template: Block `{:else} <LoadingOrError ... /> {#if post} <PostView ... /> {/if}` entfernen, sodass nur noch der Snapshot-Pfad bleibt.

- [ ] **Step 5.1.3: Type-Check**

Run: `cd app && npm run check`
Expected: 0 errors. Möglicherweise rutschen jetzt unbenutzte Imports aus früheren Iterationen rein — die mit-entfernen.

- [ ] **Step 5.1.4: Commit**

```bash
git add 'app/src/routes/[...slug]/+page.ts' 'app/src/routes/[...slug]/+page.svelte'
git commit -m "refactor(spa): runtime-fallback fuer detail-route entfernt

Detail-route lebt jetzt ausschliesslich vom snapshot. Slugs ausserhalb
des snapshots = 404. Frische nostr-first-posts erscheinen erst nach
naechstem snapshot+build-lauf.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 5.2: Live-Verifikation auf Staging und Prod

**Files:** keine

- [ ] **Step 5.2.1: Push, CI-Lauf, dann curl-Verifikation**

```bash
git push origin main
gh run watch
# Nach CI-Erfolg:
curl -sI https://joerg-lohrer.de/bibel-selfies/ | head -3
curl -s https://joerg-lohrer.de/bibel-selfies/ | grep -o '<title[^<]*</title>'
```

Erwartung:
- HTTP 200.
- `<title>Bibel-Selfies – Jörg Lohrer</title>`.

- [ ] **Step 5.2.2: Social-Media-Preview-Validation**

Manuelle Checks (External-Tool-Calls — keine automatisierbare Anforderung):
- LinkedIn Post-Inspector: https://www.linkedin.com/post-inspector/inspect/https%3A%2F%2Fjoerg-lohrer.de%2Fbibel-selfies%2F
- Mastodon-Test: Link in einer Test-Instanz posten, Preview ansehen.
- Twitter Card Validator (falls noch erreichbar) oder Browser-DevTools auf "View Page Source".

Erwartung: Titel, Beschreibung, Bild korrekt.

---

## Etappe 6 — Deploy mit `lftp mirror --delete` (optional)

Aktuelles Skript lädt jede Datei einzeln per `curl` hoch — gelöschte Posts und veraltete Hash-Bundles bleiben auf dem Server. Etappe 6 stellt auf `lftp mirror` mit Phasen-Trennung um.

Diese Etappe ist **nicht-blockierend**: ohne sie bleiben alte Asset-Hashes liegen (kein funktionaler Schaden, nur Müll im Webroot). Nur ausführen, wenn Lust drauf ist oder der Server-Zustand unübersichtlich wird.

### Task 6.1: lftp installiert prüfen + Phasen-Skript

**Files:**
- Modify: `scripts/deploy-svelte.sh`

- [ ] **Step 6.1.1: lftp lokal verfügbar?**

```bash
which lftp || brew install lftp
```

- [ ] **Step 6.1.2: Skript-Block für Upload+Delete in zwei Phasen**

Innerhalb `scripts/deploy-svelte.sh`, den Upload-Block (find + curl-Loop) ersetzen durch:

```bash
echo "Phase 1: Assets hochladen (ohne Delete) …"
lftp -c "
  set ssl:verify-certificate no
  set ftp:ssl-protect-data yes
  set ftp:ssl-allow yes
  set ftp:ssl-force yes
  open -u $FTP_USER,$FTP_PASS $FTP_HOST
  mirror -R --include-glob='_app/**' --include-glob='*.png' --include-glob='*.webp' --include-glob='*.jpg' --include-glob='*.svg' --include-glob='*.css' --include-glob='*.js' $BUILD_DIR $FTP_REMOTE_PATH
"

echo "Phase 2: HTML hochladen (ohne Delete) …"
lftp -c "
  set ssl:verify-certificate no
  set ftp:ssl-protect-data yes
  set ftp:ssl-allow yes
  set ftp:ssl-force yes
  open -u $FTP_USER,$FTP_PASS $FTP_HOST
  mirror -R --include-glob='*.html' $BUILD_DIR $FTP_REMOTE_PATH
"

echo "Phase 3: Obsolete Server-Dateien entfernen …"
lftp -c "
  set ssl:verify-certificate no
  set ftp:ssl-protect-data yes
  set ftp:ssl-allow yes
  set ftp:ssl-force yes
  open -u $FTP_USER,$FTP_PASS $FTP_HOST
  mirror -R --delete --only-existing --exclude-glob='.well-known/' --exclude-glob='joerg-profil*' --exclude-glob='favicon*' --exclude-glob='apple-touch*' --exclude-glob='android-chrome*' $BUILD_DIR $FTP_REMOTE_PATH
"
```

Hinweis: TLS-1.2-Constraint ist hier nicht direkt setzbar wie bei `curl --tls-max 1.2`. lftp verhandelt selbst — falls TLS-1.3-Probleme wie bei All-Inkl wieder auftreten, mit `set ssl:cipher-list "TLSv1.2"` einschränken.

- [ ] **Step 6.1.3: Trockenlauf gegen DEPLOY_TARGET=svelte**

```bash
DEPLOY_TARGET=svelte ./scripts/deploy-svelte.sh
```

Erwartung: drei Phasen-Logs, am Ende erreichbarer Build, keine 500er.

- [ ] **Step 6.1.4: Live-Check**

```bash
curl -sI https://svelte.joerg-lohrer.de/ | head -3
```

- [ ] **Step 6.1.5: Commit (falls Trockenlauf erfolgreich)**

```bash
git add scripts/deploy-svelte.sh
git commit -m "feat(deploy): lftp mirror in drei phasen (assets, html, delete)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review-Checkliste (für Implementierende)

Wenn alle Etappen abgeschlossen sind, gegen diese Punkte prüfen:

- [ ] `cd snapshot && deno task test` — alle Tests grün.
- [ ] `cd app && npm run test:unit` — alle Tests grün.
- [ ] `cd app && npm run check` — 0 errors.
- [ ] `curl -s https://joerg-lohrer.de/bibel-selfies/ | grep -c 'og:title'` ≥ 1.
- [ ] `curl -s https://joerg-lohrer.de/bibel-selfies/ | grep -c 'application/ld+json'` = 1.
- [ ] LinkedIn Post-Inspector zeigt korrekten Titel + Bild.
- [ ] Browser View-Source zeigt vollständigen Body als HTML.
- [ ] `joerg-lohrer.de` (Homepage) und `/archiv/` rendern weiterhin korrekt (SPA-Pfad unverändert).
- [ ] Nostr-Sprachvarianten verlinken weiterhin wechselseitig (snapshot.translations + LanguageAvailability arbeiten parallel — der eine im Snapshot-Pfad, die andere für SPA-Routen).
