# Prerender-Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post-Detailseiten `https://joerg-lohrer.de/<slug>/` werden zur Build-Zeit zu statischem HTML mit vollen OG-/Twitter-/JSON-LD-Tags prerendered, auf Basis eines Deno-Snapshot-Tools, das die Post-Daten aus den Relays holt und in portable JSON-Artefakte schreibt.

**Architecture:** Drei entkoppelte Stufen:
1. **`publish/`** — unverändert (Repo-MD → signed Event → Relays + Blossom).
2. **`snapshot/`** (neu) — liest kind:30023-Events vom Autor aus Relays, filtert NIP-09-Deletes, schreibt JSON nach `snapshot/output/index.json` + `snapshot/output/posts/<slug>.json`.
3. **SvelteKit-Prerender** — liest Snapshot-JSON, generiert pro Slug statische HTML-Datei mit eingebetteten Meta-Tags und gerendertem Markdown-Body.

**Tech Stack:** Deno, TypeScript, `@std/*`, `applesauce-relay`, `nostr-tools` (für naddr). SvelteKit 2 mit `adapter-static`, Svelte 5 Runes, `isomorphic-dompurify`. `lftp` auf macOS (deploy).

---

## Spec-Referenz

Umgesetzt: `docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md`.

## Datei-Struktur

**Zu erstellen:**

- `snapshot/deno.jsonc` — Task-Runner, Imports analog zu `publish/`.
- `snapshot/src/cli.ts` — CLI-Entrypoint mit `parseArgs`.
- `snapshot/src/config.ts` — Env-/CLI-Config-Loader.
- `snapshot/src/relays.ts` — Bootstrap + kind:10002-Load + Event-Fetch pro Relay.
- `snapshot/src/dedup.ts` — Dedup-per-d-tag, NIP-09-Filter.
- `snapshot/src/plausibility.ts` — Quorum- und Drop-Check mit `--allow-shrink`.
- `snapshot/src/cover.ts` — HEAD-Probe auf Blossom-URLs, Fallback-Logik.
- `snapshot/src/extract.ts` — Event → `PostSnapshot`-Objekt (summary-Fallback, published_at-Fallback, translations).
- `snapshot/src/write.ts` — Atomarer Schreibvorgang der JSON-Artefakte.
- `snapshot/tests/*.ts` — Unit-Tests pro Modul.
- `snapshot/README.md` — Blaupausen-Dokumentation.

**Zu ändern:**

- `app/package.json` — Dependency `isomorphic-dompurify` statt `dompurify`.
- `app/src/lib/render/markdown.ts` — DOM-Guard raus, `isomorphic-dompurify` als Quelle.
- `app/src/routes/[...slug]/+page.ts` — `prerender = true`, `entries`, `load` liest Snapshot-JSON. Laufzeit-Fallback bleibt zunächst.
- `app/src/routes/[...slug]/+page.svelte` — liest `data.snapshot` primär, Runtime-Loader als Fallback-Pfad.
- `app/src/routes/[...slug]/+page.svelte` (Cutover, Schritt 5) — Fallback-Pfad entfernt.
- `app/src/lib/components/PostView.svelte` — rendert aus Snapshot, nicht mehr nur aus Event.
- `app/src/lib/components/LanguageAvailability.svelte` — liest `translations[]` aus Page-Data, kein `loadTranslations`-Fetch mehr.
- `scripts/deploy-svelte.sh` — FTPS-Sync in drei Phasen.
- `.github/workflows/publish.yml` — optional: Snapshot-Schritt vor Build.
- `CLAUDE.md` + `docs/HANDOFF.md` — neue Kommandos und Deploy-Flow dokumentieren.

**Nicht anfassen:**

- `publish/` — komplett unverändert.
- `content/posts/**` — Repo bleibt Autorenquelle.
- `app/src/routes/+page.svelte`, `app/src/routes/archiv/+page.svelte`, `app/src/routes/tag/[name]/+page.svelte` — bleiben SPA-gerendert (laut Spec, Nicht-Ziel).

---

## Task 1: `snapshot/`-Modul bootstrappen

**Files:**
- Create: `snapshot/deno.jsonc`
- Create: `snapshot/src/cli.ts`

- [ ] **Step 1: `snapshot/`-Verzeichnis anlegen + Deno-Konfig**

Erstelle `snapshot/deno.jsonc`:

```jsonc
{
  "tasks": {
    "snapshot": "deno run --env-file=../.env.local --allow-env --allow-read --allow-write --allow-net --allow-run=git src/cli.ts",
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

- [ ] **Step 2: Minimaler CLI-Skeleton**

Erstelle `snapshot/src/cli.ts`:

```typescript
import { parseArgs } from '@std/cli/parse-args'

function usage(): string {
  return `usage: cli.ts [--out <path>] [--min-events <n>] [--cache <path>] [--allow-shrink]`
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    string: ['out', 'min-events', 'cache'],
    boolean: ['allow-shrink', 'help'],
  })
  if (args.help) {
    console.log(usage())
    return 0
  }
  console.log('snapshot: not yet implemented')
  return 0
}

if (import.meta.main) {
  Deno.exit(await main())
}
```

- [ ] **Step 3: Smoke-Test: `deno task snapshot --help` funktioniert**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task snapshot --help
```

Expected: Ausgabe `usage: cli.ts ...`, Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/deno.jsonc snapshot/src/cli.ts && git commit -m "feat(snapshot): deno-skeleton mit cli-hilfe"
```

---

## Task 2: Config-Loader mit Defaults und CLI-Overrides

**Files:**
- Create: `snapshot/src/config.ts`
- Create: `snapshot/tests/config_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/config_test.ts`:

```typescript
import { assertEquals, assertThrows } from '@std/assert'
import { loadConfig } from '../src/config.ts'

function env(map: Record<string, string | undefined>): (k: string) => string | undefined {
  return (k) => map[k]
}

Deno.test('loadConfig: nimmt defaults wenn nur pflichtfelder gesetzt', () => {
  const cfg = loadConfig(
    env({
      AUTHOR_PUBKEY_HEX: 'f'.repeat(64),
      BOOTSTRAP_RELAY: 'wss://relay.example',
    }),
    {},
  )
  assertEquals(cfg.authorPubkeyHex, 'f'.repeat(64))
  assertEquals(cfg.bootstrapRelay, 'wss://relay.example')
  assertEquals(cfg.outDir, './output')
  assertEquals(cfg.cachePath, './output/.last-snapshot.json')
  assertEquals(cfg.minEvents, null)
  assertEquals(cfg.allowShrink, false)
})

Deno.test('loadConfig: cli-flags überschreiben defaults', () => {
  const cfg = loadConfig(
    env({
      AUTHOR_PUBKEY_HEX: 'a'.repeat(64),
      BOOTSTRAP_RELAY: 'wss://relay.example',
    }),
    { out: './my-out', 'min-events': '20', cache: './my-cache.json', 'allow-shrink': true },
  )
  assertEquals(cfg.outDir, './my-out')
  assertEquals(cfg.minEvents, 20)
  assertEquals(cfg.cachePath, './my-cache.json')
  assertEquals(cfg.allowShrink, true)
})

Deno.test('loadConfig: wirft bei fehlendem pflichtfeld', () => {
  assertThrows(
    () => loadConfig(env({}), {}),
    Error,
    'Missing env',
  )
})

Deno.test('loadConfig: wirft bei invalidem pubkey', () => {
  assertThrows(
    () =>
      loadConfig(
        env({ AUTHOR_PUBKEY_HEX: 'not-hex', BOOTSTRAP_RELAY: 'wss://relay.example' }),
        {},
      ),
    Error,
    'AUTHOR_PUBKEY_HEX',
  )
})
```

- [ ] **Step 2: Run tests → FAIL**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task test
```

Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/config.ts`:

```typescript
export interface Config {
  authorPubkeyHex: string
  bootstrapRelay: string
  outDir: string
  cachePath: string
  minEvents: number | null
  allowShrink: boolean
}

type EnvReader = (key: string) => string | undefined

interface CliFlags {
  out?: string
  'min-events'?: string
  cache?: string
  'allow-shrink'?: boolean
}

const REQUIRED = ['AUTHOR_PUBKEY_HEX', 'BOOTSTRAP_RELAY'] as const

const DEFAULTS = {
  OUT_DIR: './output',
  CACHE_REL: '.last-snapshot.json',
}

export function loadConfig(read: EnvReader, flags: CliFlags): Config {
  const missing: string[] = []
  const values: Record<string, string> = {}
  for (const key of REQUIRED) {
    const v = read(key)
    if (!v) missing.push(key)
    else values[key] = v
  }
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`)
  }
  if (!/^[0-9a-f]{64}$/.test(values.AUTHOR_PUBKEY_HEX)) {
    throw new Error('AUTHOR_PUBKEY_HEX must be 64 lowercase hex characters')
  }
  const outDir = flags.out ?? DEFAULTS.OUT_DIR
  const cachePath = flags.cache ?? `${outDir}/${DEFAULTS.CACHE_REL}`
  let minEvents: number | null = null
  if (flags['min-events'] !== undefined) {
    const n = Number(flags['min-events'])
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(`--min-events must be a positive integer, got "${flags['min-events']}"`)
    }
    minEvents = n
  }
  return {
    authorPubkeyHex: values.AUTHOR_PUBKEY_HEX,
    bootstrapRelay: values.BOOTSTRAP_RELAY,
    outDir,
    cachePath,
    minEvents,
    allowShrink: flags['allow-shrink'] === true,
  }
}
```

- [ ] **Step 4: Run tests → PASS**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task test
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/config.ts snapshot/tests/config_test.ts && git commit -m "feat(snapshot): config-loader mit env + cli-flags"
```

---

## Task 3: Relay-Bootstrap (kind:10002 laden, Fallback)

**Files:**
- Create: `snapshot/src/relays.ts`
- Create: `snapshot/tests/relays_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/relays_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { parseOutboxReadRelays, FALLBACK_READ_RELAYS } from '../src/relays.ts'

const EV = (tags: string[][]) => ({
  id: 'x',
  pubkey: 'p',
  kind: 10002,
  created_at: 0,
  tags,
  content: '',
  sig: 's',
})

Deno.test('parseOutboxReadRelays: tag ohne marker → read+write', () => {
  const relays = parseOutboxReadRelays(EV([['r', 'wss://relay.example']]))
  assertEquals(relays, ['wss://relay.example'])
})

Deno.test('parseOutboxReadRelays: nur read-marker', () => {
  const relays = parseOutboxReadRelays(
    EV([
      ['r', 'wss://relay.example', 'read'],
      ['r', 'wss://write-only.example', 'write'],
    ]),
  )
  assertEquals(relays, ['wss://relay.example'])
})

Deno.test('parseOutboxReadRelays: leeres event → leeres array', () => {
  assertEquals(parseOutboxReadRelays(EV([])), [])
})

Deno.test('FALLBACK_READ_RELAYS enthält mindestens drei wss-urls', () => {
  const fb = FALLBACK_READ_RELAYS
  assertEquals(fb.length >= 3, true)
  for (const u of fb) {
    assertEquals(u.startsWith('wss://'), true)
  }
})
```

- [ ] **Step 2: Run → FAIL**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task test tests/relays_test.ts
```

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/relays.ts`:

```typescript
import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'

export interface NostrEvent {
  id: string
  pubkey: string
  kind: number
  created_at: number
  tags: string[][]
  content: string
  sig: string
}

export const FALLBACK_READ_RELAYS: readonly string[] = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
] as const

export function parseOutboxReadRelays(ev: { tags: string[][] }): string[] {
  const out: string[] = []
  for (const t of ev.tags) {
    if (t[0] !== 'r' || !t[1]) continue
    const marker = t[2]
    if (marker === 'write') continue
    out.push(t[1])
  }
  return out
}

export async function loadReadRelays(
  bootstrapRelay: string,
  authorPubkeyHex: string,
): Promise<string[]> {
  try {
    const relay = new Relay(bootstrapRelay)
    const ev = (await firstValueFrom(
      relay
        .request({ kinds: [10002], authors: [authorPubkeyHex], limit: 1 })
        .pipe(timeout({ first: 10_000 })),
    )) as NostrEvent
    const parsed = parseOutboxReadRelays(ev)
    if (parsed.length > 0) return parsed
  } catch {
    // fallthrough
  }
  return [...FALLBACK_READ_RELAYS]
}
```

- [ ] **Step 4: Run → PASS**

Expected: 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/relays.ts snapshot/tests/relays_test.ts && git commit -m "feat(snapshot): kind:10002-bootstrap + fallback-relays"
```

---

## Task 4: Event-Fetch pro Relay mit Timeout

**Files:**
- Modify: `snapshot/src/relays.ts`
- Create: `snapshot/tests/fetch_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/fetch_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { fetchEventsFromRelays, type RelayFetcher } from '../src/relays.ts'
import type { NostrEvent } from '../src/relays.ts'

const mkEv = (d: string, lang = 'de'): NostrEvent => ({
  id: d,
  pubkey: 'p',
  kind: 30023,
  created_at: 0,
  tags: [['d', d], ['l', lang]],
  content: '',
  sig: 's',
})

Deno.test('fetchEventsFromRelays: merged events aus mehreren relays', async () => {
  const fetcher: RelayFetcher = (url) => {
    if (url === 'wss://a') return Promise.resolve([mkEv('one')])
    if (url === 'wss://b') return Promise.resolve([mkEv('two')])
    return Promise.resolve([])
  }
  const result = await fetchEventsFromRelays(['wss://a', 'wss://b'], 'pk', fetcher)
  assertEquals(result.responded.sort(), ['wss://a', 'wss://b'])
  assertEquals(result.events.map((e) => e.id).sort(), ['one', 'two'])
})

Deno.test('fetchEventsFromRelays: ein relay failt → restliche liefern', async () => {
  const fetcher: RelayFetcher = (url) => {
    if (url === 'wss://a') return Promise.reject(new Error('boom'))
    if (url === 'wss://b') return Promise.resolve([mkEv('two')])
    return Promise.resolve([])
  }
  const result = await fetchEventsFromRelays(['wss://a', 'wss://b'], 'pk', fetcher)
  assertEquals(result.responded, ['wss://b'])
  assertEquals(result.events.map((e) => e.id), ['two'])
})

Deno.test('fetchEventsFromRelays: kein relay antwortet → leere responden', async () => {
  const fetcher: RelayFetcher = () => Promise.reject(new Error('nope'))
  const result = await fetchEventsFromRelays(['wss://a'], 'pk', fetcher)
  assertEquals(result.responded, [])
  assertEquals(result.events, [])
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation — am Ende von `snapshot/src/relays.ts`**

Ergänze in `snapshot/src/relays.ts` nach den existierenden Exports:

```typescript
import { lastValueFrom, toArray, EMPTY } from 'rxjs'
import { catchError } from 'rxjs/operators'

export type RelayFetcher = (url: string, pubkey: string) => Promise<NostrEvent[]>

export interface FetchResult {
  events: NostrEvent[]
  responded: string[]
}

const defaultFetcher: RelayFetcher = async (url, pubkey) => {
  const relay = new Relay(url)
  const events = (await lastValueFrom(
    relay
      .request({ kinds: [30023], authors: [pubkey], limit: 500 })
      .pipe(timeout({ first: 10_000 }), toArray(), catchError(() => EMPTY)),
    { defaultValue: [] as NostrEvent[] },
  )) as NostrEvent[]
  return events
}

const defaultDeletionFetcher: RelayFetcher = async (url, pubkey) => {
  const relay = new Relay(url)
  return (await lastValueFrom(
    relay
      .request({ kinds: [5], authors: [pubkey], limit: 500 })
      .pipe(timeout({ first: 10_000 }), toArray(), catchError(() => EMPTY)),
    { defaultValue: [] as NostrEvent[] },
  )) as NostrEvent[]
}

export async function fetchEventsFromRelays(
  urls: string[],
  pubkey: string,
  fetcher: RelayFetcher = defaultFetcher,
): Promise<FetchResult> {
  const settled = await Promise.allSettled(urls.map((u) => fetcher(u, pubkey)))
  const events: NostrEvent[] = []
  const responded: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const r = settled[i]
    if (r.status === 'fulfilled') {
      events.push(...r.value)
      responded.push(urls[i])
    }
  }
  return { events, responded }
}

export async function fetchDeletionsFromRelays(
  urls: string[],
  pubkey: string,
  fetcher: RelayFetcher = defaultDeletionFetcher,
): Promise<NostrEvent[]> {
  const settled = await Promise.allSettled(urls.map((u) => fetcher(u, pubkey)))
  const events: NostrEvent[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') events.push(...r.value)
  }
  return events
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/relays.ts snapshot/tests/fetch_test.ts && git commit -m "feat(snapshot): event- und deletion-fetch mit promise.allSettled"
```

---

## Task 5: Dedup per d-tag und NIP-09-Filter

**Files:**
- Create: `snapshot/src/dedup.ts`
- Create: `snapshot/tests/dedup_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/dedup_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { dedupByDtag, filterDeleted, extractDeletedDtags } from '../src/dedup.ts'
import type { NostrEvent } from '../src/relays.ts'

const mkEv = (d: string, created: number): NostrEvent => ({
  id: `${d}-${created}`,
  pubkey: 'pk',
  kind: 30023,
  created_at: created,
  tags: [['d', d]],
  content: '',
  sig: 's',
})

Deno.test('dedupByDtag: neuestes event pro d-tag gewinnt', () => {
  const events = [mkEv('a', 10), mkEv('a', 20), mkEv('b', 5)]
  const out = dedupByDtag(events)
  assertEquals(out.map((e) => e.id).sort(), ['a-20', 'b-5'])
})

Deno.test('dedupByDtag: events ohne d-tag werden verworfen', () => {
  const events: NostrEvent[] = [
    { ...mkEv('a', 10), tags: [] },
    mkEv('b', 5),
  ]
  assertEquals(dedupByDtag(events).map((e) => e.id), ['b-5'])
})

Deno.test('extractDeletedDtags: zieht dtags aus kind:5 a-tags', () => {
  const deletions: NostrEvent[] = [{
    id: 'd1',
    pubkey: 'pk',
    kind: 5,
    created_at: 100,
    tags: [['a', '30023:pk:foo'], ['a', '30023:pk:bar']],
    content: '',
    sig: 's',
  }]
  const set = extractDeletedDtags(deletions, 'pk')
  assertEquals([...set].sort(), ['bar', 'foo'])
})

Deno.test('extractDeletedDtags: ignoriert a-tags auf andere kinds oder pubkeys', () => {
  const deletions: NostrEvent[] = [{
    id: 'd1',
    pubkey: 'pk',
    kind: 5,
    created_at: 100,
    tags: [
      ['a', '30023:otherpk:foo'],
      ['a', '1:pk:bar'],
      ['a', '30023:pk:ok'],
    ],
    content: '',
    sig: 's',
  }]
  assertEquals([...extractDeletedDtags(deletions, 'pk')], ['ok'])
})

Deno.test('filterDeleted: entfernt events mit dtag aus delete-set', () => {
  const events = [mkEv('keep', 10), mkEv('gone', 20)]
  const out = filterDeleted(events, new Set(['gone']))
  assertEquals(out.map((e) => e.id), ['keep-10'])
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/dedup.ts`:

```typescript
import type { NostrEvent } from './relays.ts'

export function dedupByDtag(events: NostrEvent[]): NostrEvent[] {
  const byDtag = new Map<string, NostrEvent>()
  for (const ev of events) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) continue
    const existing = byDtag.get(d)
    if (!existing || ev.created_at > existing.created_at) byDtag.set(d, ev)
  }
  return [...byDtag.values()]
}

export function extractDeletedDtags(
  deletions: NostrEvent[],
  authorPubkeyHex: string,
): Set<string> {
  const out = new Set<string>()
  for (const d of deletions) {
    if (d.kind !== 5) continue
    if (d.pubkey !== authorPubkeyHex) continue
    for (const t of d.tags) {
      if (t[0] !== 'a' || !t[1]) continue
      const [kindStr, pk, dtag] = t[1].split(':')
      if (kindStr !== '30023') continue
      if (pk !== authorPubkeyHex) continue
      if (!dtag) continue
      out.add(dtag)
    }
  }
  return out
}

export function filterDeleted(
  events: NostrEvent[],
  deleted: Set<string>,
): NostrEvent[] {
  return events.filter((ev) => {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    return d ? !deleted.has(d) : false
  })
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/dedup.ts snapshot/tests/dedup_test.ts && git commit -m "feat(snapshot): dedup-by-dtag + NIP-09-filter"
```

---

## Task 6: Plausibilitätscheck mit Drop- und Quorum-Regeln

**Files:**
- Create: `snapshot/src/plausibility.ts`
- Create: `snapshot/tests/plausibility_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/plausibility_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { checkPlausibility } from '../src/plausibility.ts'

Deno.test('quorum 3/5 → ok, 2/5 → fail', () => {
  const ok = checkPlausibility({
    queried: 5,
    responded: 3,
    eventCount: 27,
    minEventsOverride: null,
    cachedPostCount: 27,
    knownDeletedCount: 0,
    allowShrink: false,
  })
  assertEquals(ok.ok, true)

  const bad = checkPlausibility({
    queried: 5,
    responded: 2,
    eventCount: 27,
    minEventsOverride: null,
    cachedPostCount: 27,
    knownDeletedCount: 0,
    allowShrink: false,
  })
  assertEquals(bad.ok, false)
  assertEquals(bad.reason?.startsWith('quorum'), true)
})

Deno.test('ohne cache und ohne flag: default min-events = 1', () => {
  assertEquals(
    checkPlausibility({
      queried: 1,
      responded: 1,
      eventCount: 1,
      minEventsOverride: null,
      cachedPostCount: null,
      knownDeletedCount: 0,
      allowShrink: false,
    }).ok,
    true,
  )
  const bad = checkPlausibility({
    queried: 1,
    responded: 1,
    eventCount: 0,
    minEventsOverride: null,
    cachedPostCount: null,
    knownDeletedCount: 0,
    allowShrink: false,
  })
  assertEquals(bad.ok, false)
  assertEquals(bad.reason?.startsWith('min-events'), true)
})

Deno.test('mit cache: default min-events = cache - 2', () => {
  const bad = checkPlausibility({
    queried: 5,
    responded: 5,
    eventCount: 20,
    minEventsOverride: null,
    cachedPostCount: 27,
    knownDeletedCount: 0,
    allowShrink: false,
  })
  // 20 < 27-2=25 → fail
  assertEquals(bad.ok, false)
})

Deno.test('drop > 20% → fail wenn keine passende deletion-zählt', () => {
  const bad = checkPlausibility({
    queried: 5,
    responded: 5,
    eventCount: 20,
    minEventsOverride: 1,
    cachedPostCount: 27,
    knownDeletedCount: 0,
    allowShrink: false,
  })
  // drop = 7, 7/27 > 20% → fail
  assertEquals(bad.ok, false)
  assertEquals(bad.reason?.startsWith('drop'), true)
})

Deno.test('drop > 20% aber alle durch kind:5 erklärt → ok', () => {
  const ok = checkPlausibility({
    queried: 5,
    responded: 5,
    eventCount: 20,
    minEventsOverride: 1,
    cachedPostCount: 27,
    knownDeletedCount: 7,
    allowShrink: false,
  })
  assertEquals(ok.ok, true)
})

Deno.test('drop > 20%, allow-shrink → ok', () => {
  const ok = checkPlausibility({
    queried: 5,
    responded: 5,
    eventCount: 20,
    minEventsOverride: 1,
    cachedPostCount: 27,
    knownDeletedCount: 0,
    allowShrink: true,
  })
  assertEquals(ok.ok, true)
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/plausibility.ts`:

```typescript
export interface PlausibilityInput {
  queried: number
  responded: number
  eventCount: number
  minEventsOverride: number | null
  cachedPostCount: number | null
  knownDeletedCount: number
  allowShrink: boolean
}

export interface PlausibilityResult {
  ok: boolean
  reason?: string
}

const DROP_THRESHOLD_PCT = 20

export function checkPlausibility(input: PlausibilityInput): PlausibilityResult {
  const quorum = Math.ceil(input.queried * 0.6)
  if (input.responded < quorum) {
    return {
      ok: false,
      reason: `quorum: ${input.responded}/${input.queried} responded, need >= ${quorum}`,
    }
  }
  const minEvents = input.minEventsOverride
    ?? (input.cachedPostCount !== null ? Math.max(1, input.cachedPostCount - 2) : 1)
  if (input.eventCount < minEvents) {
    return {
      ok: false,
      reason: `min-events: ${input.eventCount} < ${minEvents}`,
    }
  }
  if (input.cachedPostCount !== null && input.eventCount < input.cachedPostCount) {
    const drop = input.cachedPostCount - input.eventCount
    const dropPct = (drop / input.cachedPostCount) * 100
    if (dropPct > DROP_THRESHOLD_PCT) {
      if (input.allowShrink) return { ok: true }
      if (input.knownDeletedCount >= drop) return { ok: true }
      return {
        ok: false,
        reason:
          `drop: ${drop}/${input.cachedPostCount} (${dropPct.toFixed(1)}%) > ${DROP_THRESHOLD_PCT}% and only ${input.knownDeletedCount} deletions seen; pass --allow-shrink to override`,
      }
    }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/plausibility.ts snapshot/tests/plausibility_test.ts && git commit -m "feat(snapshot): plausibilitäts-check quorum + drop + allow-shrink"
```

---

## Task 7: Cover-Bild-Probe mit Blossom-Fallback

**Files:**
- Create: `snapshot/src/cover.ts`
- Create: `snapshot/tests/cover_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/cover_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { probeCover, type HeadProbe } from '../src/cover.ts'

Deno.test('probeCover: primary 200 → url = primary', async () => {
  const probe: HeadProbe = async (u) => u === 'https://a/x.jpg' ? 200 : 0
  const out = await probeCover({
    primary: 'https://a/x.jpg',
    fallbacks: ['https://b/x.jpg'],
  }, probe)
  assertEquals(out.url, 'https://a/x.jpg')
  assertEquals(out.fallbackUrl, 'https://b/x.jpg')
  assertEquals(out.warnings, [])
})

Deno.test('probeCover: primary fail, fallback ok → url = fallback', async () => {
  const probe: HeadProbe = async (u) => u === 'https://b/x.jpg' ? 200 : 500
  const out = await probeCover({
    primary: 'https://a/x.jpg',
    fallbacks: ['https://b/x.jpg'],
  }, probe)
  assertEquals(out.url, 'https://b/x.jpg')
  assertEquals(out.fallbackUrl, 'https://a/x.jpg')
  assertEquals(out.warnings.length, 1)
})

Deno.test('probeCover: beide tot → url = primary + warnung', async () => {
  const probe: HeadProbe = async () => 404
  const out = await probeCover({
    primary: 'https://a/x.jpg',
    fallbacks: ['https://b/x.jpg'],
  }, probe)
  assertEquals(out.url, 'https://a/x.jpg')
  assertEquals(out.warnings.length, 2)
})

Deno.test('probeCover: keine fallbacks → url = primary', async () => {
  const probe: HeadProbe = async () => 200
  const out = await probeCover({ primary: 'https://a/x.jpg', fallbacks: [] }, probe)
  assertEquals(out.url, 'https://a/x.jpg')
  assertEquals(out.fallbackUrl, null)
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/cover.ts`:

```typescript
export type HeadProbe = (url: string) => Promise<number>

export interface CoverInput {
  primary: string
  fallbacks: string[]
}

export interface CoverResult {
  url: string
  fallbackUrl: string | null
  warnings: string[]
}

export const defaultHeadProbe: HeadProbe = async (url) => {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status
  } catch {
    return 0
  }
}

export async function probeCover(
  input: CoverInput,
  probe: HeadProbe = defaultHeadProbe,
): Promise<CoverResult> {
  const warnings: string[] = []
  const primaryStatus = await probe(input.primary)
  if (primaryStatus === 200) {
    return {
      url: input.primary,
      fallbackUrl: input.fallbacks[0] ?? null,
      warnings,
    }
  }
  warnings.push(`primary-unreachable: ${input.primary} (status=${primaryStatus})`)
  for (const fb of input.fallbacks) {
    const status = await probe(fb)
    if (status === 200) {
      return {
        url: fb,
        fallbackUrl: input.primary,
        warnings,
      }
    }
    warnings.push(`fallback-unreachable: ${fb} (status=${status})`)
  }
  return {
    url: input.primary,
    fallbackUrl: input.fallbacks[0] ?? null,
    warnings,
  }
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/cover.ts snapshot/tests/cover_test.ts && git commit -m "feat(snapshot): cover-probe mit blossom-fallback-urls"
```

---

## Task 8: Event → `PostSnapshot`-Extraktion

**Files:**
- Create: `snapshot/src/extract.ts`
- Create: `snapshot/tests/extract_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/extract_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { extractPostSnapshot, deriveSummary, type TranslationLookup } from '../src/extract.ts'
import type { NostrEvent } from '../src/relays.ts'

const PK = 'a'.repeat(64)

function ev(partial: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'e1',
    pubkey: PK,
    kind: 30023,
    created_at: 1000,
    tags: [['d', 'post-slug'], ['title', 'Titel'], ['l', 'de']],
    content: 'Body',
    sig: 's',
    ...partial,
  }
}

Deno.test('deriveSummary: kürzt auf 200 zeichen an wortgrenze mit ellipsis', () => {
  const long = 'Wort '.repeat(60).trim()
  const s = deriveSummary(long)
  assertEquals(s.length <= 201, true)
  assertEquals(s.endsWith('…'), true)
})

Deno.test('deriveSummary: kurzer text unverändert', () => {
  assertEquals(deriveSummary('Kurzer Text.'), 'Kurzer Text.')
})

Deno.test('deriveSummary: entfernt markdown-heading-zeichen', () => {
  const s = deriveSummary('# Titel\n\nEin Satz.')
  assertEquals(s.startsWith('Titel'), true)
})

Deno.test('extractPostSnapshot: happy path mit title/summary/image', () => {
  const e = ev({
    tags: [
      ['d', 'hallo'],
      ['title', 'Hallo Welt'],
      ['summary', 'Kurzer Abriss.'],
      ['image', 'https://blossom.edufeed.org/hash.jpg'],
      ['l', 'de'],
      ['published_at', '999'],
      ['t', 'a'],
      ['t', 'b'],
    ],
  })
  const lookup: TranslationLookup = () => []
  const snap = extractPostSnapshot(e, { translationTitles: lookup })
  assertEquals(snap.slug, 'hallo')
  assertEquals(snap.title, 'Hallo Welt')
  assertEquals(snap.summary, 'Kurzer Abriss.')
  assertEquals(snap.lang, 'de')
  assertEquals(snap.publishedAt, 999)
  assertEquals(snap.createdAt, 1000)
  assertEquals(snap.tags, ['a', 'b'])
  assertEquals(snap.coverImageUrl, 'https://blossom.edufeed.org/hash.jpg')
})

Deno.test('extractPostSnapshot: fehlt summary → aus body abgeleitet', () => {
  const e = ev({ content: 'Langer Body-Text ohne Summary-Tag im Event.' })
  const snap = extractPostSnapshot(e, { translationTitles: () => [] })
  assertEquals(snap.summary.length > 0, true)
  assertEquals(snap.summary.startsWith('Langer'), true)
})

Deno.test('extractPostSnapshot: fehlt published_at → created_at', () => {
  const e = ev({ tags: [['d', 'x'], ['title', 'T'], ['l', 'de']] })
  const snap = extractPostSnapshot(e, { translationTitles: () => [] })
  assertEquals(snap.publishedAt, snap.createdAt)
})

Deno.test('extractPostSnapshot: liest translations aus a-tags mit marker', () => {
  const e = ev({
    tags: [
      ['d', 'bibel-selfies'],
      ['title', 'Bibel-Selfies'],
      ['l', 'de'],
      ['a', `30023:${PK}:bible-selfies`, '', 'translation'],
    ],
  })
  const lookup: TranslationLookup = (dtag) =>
    dtag === 'bible-selfies' ? [{ dtag, lang: 'en', title: 'Bible Selfies' }] : []
  const snap = extractPostSnapshot(e, { translationTitles: lookup })
  assertEquals(snap.translations, [{ lang: 'en', slug: 'bible-selfies', title: 'Bible Selfies' }])
})

Deno.test('extractPostSnapshot: ignoriert a-tags ohne translation-marker', () => {
  const e = ev({
    tags: [
      ['d', 'x'],
      ['title', 'T'],
      ['l', 'de'],
      ['a', `30023:${PK}:other`, '', 'root'],
    ],
  })
  const snap = extractPostSnapshot(e, { translationTitles: () => [] })
  assertEquals(snap.translations, [])
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/extract.ts`:

```typescript
import type { NostrEvent } from './relays.ts'

export interface TranslationInfo {
  lang: string
  slug: string
  title: string
}

export interface PostSnapshot {
  slug: string
  eventId: string
  createdAt: number
  publishedAt: number
  title: string
  summary: string
  lang: string
  coverImageUrl: string | null
  coverImageAlt: string | null
  contentMarkdown: string
  tags: string[]
  translations: TranslationInfo[]
}

export interface TranslationLookupEntry {
  dtag: string
  lang: string
  title: string
}

export type TranslationLookup = (dtag: string) => TranslationLookupEntry[]

export interface ExtractOptions {
  translationTitles: TranslationLookup
}

const SUMMARY_MAX = 200

export function deriveSummary(body: string): string {
  const stripped = body
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length <= SUMMARY_MAX) return stripped
  const truncated = stripped.slice(0, SUMMARY_MAX)
  const lastSpace = truncated.lastIndexOf(' ')
  const cut = lastSpace > SUMMARY_MAX * 0.6 ? lastSpace : SUMMARY_MAX
  return stripped.slice(0, cut).trimEnd() + '…'
}

function tagValue(ev: NostrEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1]
}

function tagAll(ev: NostrEvent, name: string): string[] {
  return ev.tags.filter((t) => t[0] === name && t[1]).map((t) => t[1])
}

function parseTranslationDtags(ev: NostrEvent, pubkey: string): string[] {
  const out: string[] = []
  for (const t of ev.tags) {
    if (t[0] !== 'a' || t[3] !== 'translation' || !t[1]) continue
    const [kindStr, pk, dtag] = t[1].split(':')
    if (kindStr !== '30023' || pk !== pubkey || !dtag) continue
    out.push(dtag)
  }
  return out
}

export function extractPostSnapshot(
  event: NostrEvent,
  opts: ExtractOptions,
): PostSnapshot {
  const slug = tagValue(event, 'd') ?? ''
  const title = tagValue(event, 'title') ?? ''
  const summaryTag = tagValue(event, 'summary')
  const image = tagValue(event, 'image') ?? null
  const imageAlt = tagValue(event, 'image_alt') ?? null
  const lang = tagValue(event, 'l') ?? 'de'
  const publishedAtTag = tagValue(event, 'published_at')
  const publishedAt = publishedAtTag ? parseInt(publishedAtTag, 10) : event.created_at
  const translationDtags = parseTranslationDtags(event, event.pubkey)
  const translations: TranslationInfo[] = []
  for (const dtag of translationDtags) {
    for (const info of opts.translationTitles(dtag)) {
      translations.push({ lang: info.lang, slug: info.dtag, title: info.title })
    }
  }
  return {
    slug,
    eventId: event.id,
    createdAt: event.created_at,
    publishedAt,
    title,
    summary: summaryTag && summaryTag.trim().length > 0
      ? summaryTag.trim()
      : deriveSummary(event.content),
    lang,
    coverImageUrl: image,
    coverImageAlt: imageAlt,
    contentMarkdown: event.content,
    tags: tagAll(event, 't'),
    translations,
  }
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/extract.ts snapshot/tests/extract_test.ts && git commit -m "feat(snapshot): event → post-snapshot-extraktion mit summary- und translations-logik"
```

---

## Task 9: JSON-Writer (atomar) + Cache

**Files:**
- Create: `snapshot/src/write.ts`
- Create: `snapshot/tests/write_test.ts`

- [ ] **Step 1: Failing Test**

Erstelle `snapshot/tests/write_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { writeSnapshot, readCache, type Catalog, type PostFileEntry } from '../src/write.ts'

Deno.test('writeSnapshot: schreibt index.json und posts/<slug>.json', async () => {
  const tmp = await Deno.makeTempDir()
  const catalog: Catalog = {
    generated_at: '2026-04-21T10:30:00Z',
    author_pubkey: 'a'.repeat(64),
    relays_queried: ['wss://a'],
    relays_responded: ['wss://a'],
    post_count: 1,
    posts: [{ slug: 'x', lang: 'de', created_at: 10, title: 'T' }],
  }
  const files: PostFileEntry[] = [{
    slug: 'x',
    data: { slug: 'x', title: 'T' },
  }]
  await writeSnapshot({ outDir: tmp, cachePath: `${tmp}/.cache.json`, catalog, files })
  const idx = JSON.parse(await Deno.readTextFile(`${tmp}/index.json`))
  assertEquals(idx.post_count, 1)
  const post = JSON.parse(await Deno.readTextFile(`${tmp}/posts/x.json`))
  assertEquals(post.slug, 'x')
  const cache = JSON.parse(await Deno.readTextFile(`${tmp}/.cache.json`))
  assertEquals(cache.post_count, 1)
  await Deno.remove(tmp, { recursive: true })
})

Deno.test('readCache: vorhanden → post_count, fehlend → null', async () => {
  const tmp = await Deno.makeTempDir()
  assertEquals(await readCache(`${tmp}/missing.json`), null)
  await Deno.writeTextFile(`${tmp}/ok.json`, JSON.stringify({ post_count: 42 }))
  const c = await readCache(`${tmp}/ok.json`)
  assertEquals(c?.post_count, 42)
  await Deno.remove(tmp, { recursive: true })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementation**

Erstelle `snapshot/src/write.ts`:

```typescript
import { ensureDir } from '@std/fs'
import { dirname, join } from '@std/path'

export interface CatalogEntry {
  slug: string
  lang: string
  created_at: number
  title: string
}

export interface Catalog {
  generated_at: string
  author_pubkey: string
  relays_queried: string[]
  relays_responded: string[]
  post_count: number
  posts: CatalogEntry[]
}

export interface PostFileEntry {
  slug: string
  data: unknown
}

export interface WriteArgs {
  outDir: string
  cachePath: string
  catalog: Catalog
  files: PostFileEntry[]
}

export interface CacheState {
  post_count: number
  generated_at?: string
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path))
  const tmp = `${path}.tmp`
  await Deno.writeTextFile(tmp, JSON.stringify(value, null, 2) + '\n')
  await Deno.rename(tmp, path)
}

export async function writeSnapshot(args: WriteArgs): Promise<void> {
  const postsDir = join(args.outDir, 'posts')
  await ensureDir(postsDir)
  for (const f of args.files) {
    await writeJsonAtomic(join(postsDir, `${f.slug}.json`), f.data)
  }
  await writeJsonAtomic(join(args.outDir, 'index.json'), args.catalog)
  const cache: CacheState = {
    post_count: args.catalog.post_count,
    generated_at: args.catalog.generated_at,
  }
  await writeJsonAtomic(args.cachePath, cache)
}

export async function readCache(path: string): Promise<CacheState | null> {
  try {
    const text = await Deno.readTextFile(path)
    const parsed = JSON.parse(text) as CacheState
    if (typeof parsed.post_count !== 'number') return null
    return parsed
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/write.ts snapshot/tests/write_test.ts && git commit -m "feat(snapshot): atomarer json-writer + cache-reader"
```

---

## Task 10: CLI-Orchestrierung — alle Module verdrahten

**Files:**
- Modify: `snapshot/src/cli.ts`

- [ ] **Step 1: CLI ausbauen**

Ersetze `snapshot/src/cli.ts` komplett durch:

```typescript
import { parseArgs } from '@std/cli/parse-args'
import { loadConfig } from './config.ts'
import { loadReadRelays, fetchEventsFromRelays, fetchDeletionsFromRelays } from './relays.ts'
import { dedupByDtag, extractDeletedDtags, filterDeleted } from './dedup.ts'
import { checkPlausibility } from './plausibility.ts'
import { probeCover } from './cover.ts'
import { extractPostSnapshot, type TranslationLookupEntry } from './extract.ts'
import { readCache, writeSnapshot, type Catalog, type PostFileEntry } from './write.ts'
import { nip19 } from 'nostr-tools'

function usage(): string {
  return `usage: cli.ts [--out <path>] [--min-events <n>] [--cache <path>] [--allow-shrink]`
}

const BLOSSOM_FALLBACKS = [
  'https://blossom.edufeed.org',
  'https://blossom.primal.net',
]

function buildFallbackUrls(primary: string): string[] {
  // Blossom URLs enden mit /<hash>.<ext> — wenn die Host-Base einer der
  // bekannten Blossom-Server ist, erzeuge URLs auf den jeweils anderen.
  try {
    const u = new URL(primary)
    const rest = u.pathname
    return BLOSSOM_FALLBACKS
      .filter((b) => !primary.startsWith(b))
      .map((b) => `${b}${rest}`)
  } catch {
    return []
  }
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    string: ['out', 'min-events', 'cache'],
    boolean: ['allow-shrink', 'help'],
  })
  if (args.help) {
    console.log(usage())
    return 0
  }
  const cfg = loadConfig((k) => Deno.env.get(k), {
    out: args.out,
    'min-events': args['min-events'],
    cache: args.cache,
    'allow-shrink': args['allow-shrink'],
  })
  console.log(`snapshot: pubkey=${cfg.authorPubkeyHex.slice(0, 8)}… out=${cfg.outDir}`)

  console.log('[1/5] read-relays bootstrap…')
  const relays = await loadReadRelays(cfg.bootstrapRelay, cfg.authorPubkeyHex)
  console.log(`relays: ${relays.length}`)

  console.log('[2/5] fetch kind:30023 + kind:5…')
  const [events, deletions] = await Promise.all([
    fetchEventsFromRelays(relays, cfg.authorPubkeyHex),
    fetchDeletionsFromRelays(relays, cfg.authorPubkeyHex),
  ])
  console.log(`events: ${events.events.length} gesamt, responded: ${events.responded.length}/${relays.length}`)

  console.log('[3/5] dedup + NIP-09-filter + plausibilität…')
  const deduped = dedupByDtag(events.events)
  const deletedDtags = extractDeletedDtags(deletions, cfg.authorPubkeyHex)
  const alive = filterDeleted(deduped, deletedDtags)
  const cache = await readCache(cfg.cachePath)
  const plausibility = checkPlausibility({
    queried: relays.length,
    responded: events.responded.length,
    eventCount: alive.length,
    minEventsOverride: cfg.minEvents,
    cachedPostCount: cache?.post_count ?? null,
    knownDeletedCount: deletedDtags.size,
    allowShrink: cfg.allowShrink,
  })
  if (!plausibility.ok) {
    console.error(`HARD-FAIL plausibilität: ${plausibility.reason}`)
    return 1
  }
  console.log(`alive: ${alive.length} posts`)

  console.log('[4/5] extract + cover-probe…')
  // Translation-Lookup-Map: d-tag → {lang,title}
  const titleByDtag = new Map<string, { lang: string; title: string }>()
  for (const e of alive) {
    const d = e.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) continue
    titleByDtag.set(d, {
      lang: e.tags.find((t) => t[0] === 'l')?.[1] ?? 'de',
      title: e.tags.find((t) => t[0] === 'title')?.[1] ?? '',
    })
  }
  const lookup = (dtag: string): TranslationLookupEntry[] => {
    const hit = titleByDtag.get(dtag)
    return hit ? [{ dtag, lang: hit.lang, title: hit.title }] : []
  }

  const files: PostFileEntry[] = []
  const catalogEntries: Catalog['posts'] = []
  for (const ev of alive) {
    const snap = extractPostSnapshot(ev, { translationTitles: lookup })
    if (!snap.slug) continue
    let cover: { url: string; fallbackUrl: string | null } | null = null
    if (snap.coverImageUrl) {
      const result = await probeCover({
        primary: snap.coverImageUrl,
        fallbacks: buildFallbackUrls(snap.coverImageUrl),
      })
      cover = { url: result.url, fallbackUrl: result.fallbackUrl }
      for (const w of result.warnings) console.warn(`cover [${snap.slug}]: ${w}`)
    }
    const naddr = nip19.naddrEncode({
      pubkey: cfg.authorPubkeyHex,
      kind: 30023,
      identifier: snap.slug,
      relays: [],
    })
    files.push({
      slug: snap.slug,
      data: {
        slug: snap.slug,
        event_id: snap.eventId,
        created_at: snap.createdAt,
        published_at: snap.publishedAt,
        title: snap.title,
        summary: snap.summary,
        lang: snap.lang,
        cover_image: cover ? {
          url: cover.url,
          fallback_url: cover.fallbackUrl,
          alt: snap.coverImageAlt,
        } : null,
        content_markdown: snap.contentMarkdown,
        tags: snap.tags,
        naddr,
        habla_url: `https://habla.news/a/${naddr}`,
        translations: snap.translations,
      },
    })
    catalogEntries.push({
      slug: snap.slug,
      lang: snap.lang,
      created_at: snap.createdAt,
      title: snap.title,
    })
  }

  console.log('[5/5] write JSON…')
  const catalog: Catalog = {
    generated_at: new Date().toISOString(),
    author_pubkey: cfg.authorPubkeyHex,
    relays_queried: relays,
    relays_responded: events.responded,
    post_count: alive.length,
    posts: catalogEntries.sort((a, b) => b.created_at - a.created_at),
  }
  await writeSnapshot({
    outDir: cfg.outDir,
    cachePath: cfg.cachePath,
    catalog,
    files,
  })
  console.log(`done: ${files.length} posts → ${cfg.outDir}`)
  return 0
}

if (import.meta.main) {
  Deno.exit(await main())
}
```

- [ ] **Step 2: Tests weiterhin grün**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task test
```

Expected: alle Tests grün, keine Regression.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno check src/cli.ts
```

Expected: Keine Typ-Fehler.

- [ ] **Step 4: Smoke-Test gegen echte Relays**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task snapshot --out ./output
```

Expected: 27 Posts gelistet, `snapshot/output/index.json` und `snapshot/output/posts/*.json` geschrieben.

Falls Hard-Fail: Log prüfen, Relay-Konnektivität prüfen.

- [ ] **Step 5: `snapshot/output/`-Artefakte gitignoren**

Füge in `/Users/joerglohrer/repositories/joerglohrerde/.gitignore` hinzu:

```
snapshot/output/
```

Oder falls ein `snapshot/.gitignore` bevorzugt wird:

```bash
echo "output/" > /Users/joerglohrer/repositories/joerglohrerde/snapshot/.gitignore
```

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/src/cli.ts snapshot/.gitignore && git commit -m "feat(snapshot): cli verdrahtet alle module zu end-to-end-lauf"
```

---

## Task 11: `snapshot/README.md` als Blaupausen-Doku

**Files:**
- Create: `snapshot/README.md`

- [ ] **Step 1: README schreiben**

Erstelle `snapshot/README.md`:

```markdown
# snapshot

Deno-Tool, das kind:30023-Events des eigenen Pubkeys aus Nostr-Relays
holt, NIP-09-Deletions anwendet und portable JSON-Artefakte schreibt.

Die JSON-Artefakte werden von einem Static-Site-Generator (SvelteKit,
Astro, Eleventy …) zur Build-Zeit als Datenquelle für Prerender genutzt
— damit Post-URLs beim ersten Request echtes HTML mit OG-/Twitter-/
JSON-LD-Metadaten liefern statt SPA-Fallback.

## Minimal-Usage

```sh
export AUTHOR_PUBKEY_HEX="<64 hex>"
export BOOTSTRAP_RELAY="wss://relay.damus.io"
cd snapshot
deno task snapshot --out ./output
```

Ergebnis:

- `./output/index.json` — Katalog aller Posts.
- `./output/posts/<slug>.json` — ein Eintrag pro Post.
- `./output/.last-snapshot.json` — Cache für Plausibilitätscheck.

## CLI-Flags

| Flag | Default | Zweck |
|---|---|---|
| `--out <path>` | `./output` | Zielverzeichnis |
| `--min-events <n>` | `cached-2` bzw. `1` | Untergrenze der Post-Zahl |
| `--cache <path>` | `<out>/.last-snapshot.json` | Vergleichs-Cache |
| `--allow-shrink` | aus | Drop-Check deaktivieren (bei bewusstem Masse-Löschen) |

## Plausibilitätschecks

- Mindestens 60 % der Read-Relays müssen antworten.
- Post-Zahl >= `--min-events`.
- Falls Cache vorhanden: Drop > 20 % ist Hard-Fail, außer
  - genau so viele Posts wurden per `kind:5` gelöscht, oder
  - `--allow-shrink` ist gesetzt.

## Blaupausen-Eigenschaften

- **Konfiguration nur via env/CLI** — keine hart gecodeten Relay-Listen.
- **JSON-Output ist stabile Schnittstelle** — der Renderer ist austauschbar.
- **Explizite Grenzen:** nur kind:30023, nur eigener Pubkey, kein
  Live-Proxy. Diese Grenzen sind Feature, nicht Bug.

Der Primary-Renderer dieser Codebase ist SvelteKit — siehe
`../app/src/routes/[...slug]/+page.ts`. Für andere Renderer gilt: das
JSON-Schema ist in `src/extract.ts` und `src/cli.ts` festgelegt,
unveränderte Felder dürfen ignoriert werden.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add snapshot/README.md && git commit -m "docs(snapshot): readme als blaupausen-dokumentation"
```

---

## Task 12: `renderMarkdown` Node-kompatibel machen (Migrations-Schritt 1)

**Files:**
- Modify: `app/package.json`
- Modify: `app/src/lib/render/markdown.ts`

- [ ] **Step 1: `dompurify` durch `isomorphic-dompurify` ersetzen**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm uninstall dompurify @types/dompurify && npm install isomorphic-dompurify
```

Expected: Installation ohne Fehler, `isomorphic-dompurify` in `package.json` als Dependency.

- [ ] **Step 2: `renderMarkdown` umstellen**

Ersetze `app/src/lib/render/markdown.ts` komplett durch:

```typescript
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

/**
 * Lokaler Marked-Instance, damit die globale `marked`-Singleton nicht
 * mutiert wird — andere Module können `marked` unbeeinflusst weiterverwenden.
 */
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

/**
 * Rendert einen Markdown-String zu sanitized HTML.
 * Funktioniert in Browser, jsdom und Node — `isomorphic-dompurify`
 * bringt in Node-Umgebungen automatisch eine DOM-Implementierung mit.
 */
export function renderMarkdown(md: string): string {
	const raw = markedInstance.parse(md, { async: false }) as string;
	return DOMPurify.sanitize(raw);
}
```

- [ ] **Step 3: Tests und Build prüfen**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -5
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -10
```

Expected: Alle Tests grün (42), svelte-check 0 Errors, Build erfolgreich.

- [ ] **Step 4: Node-Smoke-Test**

Erstelle kurzzeitig `app/tests/unit/markdown-node.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '$lib/render/markdown';

describe('renderMarkdown (node-smoke)', () => {
	it('rendert ohne DOM-Error in Node-Umgebung', () => {
		const html = renderMarkdown('# Hallo\n\nText **fett**.');
		expect(html).toContain('<h1>');
		expect(html).toContain('<strong>');
	});
	it('sanitized XSS', () => {
		const html = renderMarkdown('<script>alert(1)</script>');
		expect(html).not.toContain('<script>');
	});
});
```

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -5
```

Expected: 44 passed (+2 neue).

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add app/package.json app/src/lib/render/markdown.ts 'app/tests/unit/markdown-node.test.ts' && git commit -m "refactor(app): renderMarkdown via isomorphic-dompurify node+browser"
```

---

## Task 13: Prerender-Route `+page.ts` auf Snapshot umstellen (mit Fallback)

**Files:**
- Modify: `app/src/routes/[...slug]/+page.ts`

- [ ] **Step 1: Snapshot-Pfad konstant definieren**

Öffne `app/src/routes/[...slug]/+page.ts` und ersetze den Inhalt durch:

```typescript
import { error, redirect } from '@sveltejs/kit';
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

const SNAPSHOT_DIR = resolve('../snapshot/output');
const CATALOG_PATH = `${SNAPSHOT_DIR}/index.json`;

interface Catalog {
	posts: { slug: string }[];
}

export const entries: EntryGenerator = () => {
	if (!existsSync(CATALOG_PATH)) return [];
	const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')) as Catalog;
	return catalog.posts.map((p) => ({ slug: p.slug }));
};

export const load: PageLoad = async ({ url }) => {
	const pathname = url.pathname;
	const legacyDtag = parseLegacyUrl(pathname);
	if (legacyDtag) {
		throw redirect(301, canonicalPostPath(legacyDtag));
	}

	const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
	if (segments.length !== 1 || !segments[0]) {
		throw error(404, 'Seite nicht gefunden');
	}
	const dtag = decodeURIComponent(segments[0]);

	// Snapshot-Daten zur Build-Zeit laden, falls vorhanden.
	const postPath = `${SNAPSHOT_DIR}/posts/${dtag}.json`;
	let snapshot: unknown = null;
	if (existsSync(postPath)) {
		snapshot = JSON.parse(readFileSync(postPath, 'utf-8'));
	}

	return { dtag, snapshot };
};
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
```

Expected: 0 Errors.

- [ ] **Step 3: Snapshot-Lauf voraus**

Falls Snapshot-Output noch nicht vorhanden:

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task snapshot --out ./output
```

- [ ] **Step 4: Build**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -15
```

Expected: SvelteKit ruft `entries()` auf und erzeugt pro Slug ein Build-Verzeichnis in `app/build/<slug>/index.html`. Keine Build-Fehler.

Verify:
```bash
ls /Users/joerglohrer/repositories/joerglohrerde/app/build/ | head -10
ls /Users/joerglohrer/repositories/joerglohrerde/app/build/bibel-selfies/
```
Expected: `index.html` existiert pro Slug.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add 'app/src/routes/[...slug]/+page.ts' && git commit -m "feat(app): post-route liest snapshot-json + prerender=true"
```

---

## Task 14: `+page.svelte` rendert Snapshot primär, Runtime als Fallback

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`
- Modify: `app/src/lib/components/PostView.svelte`
- Modify: `app/src/lib/components/LanguageAvailability.svelte`

- [ ] **Step 1: `+page.svelte` umstellen**

Ersetze `app/src/routes/[...slug]/+page.svelte` komplett durch:

```svelte
<script lang="ts">
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { loadPost } from '$lib/nostr/loaders';
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
	import { buildHablaLink } from '$lib/nostr/naddr';
	import PostView from '$lib/components/PostView.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let { data } = $props();
	const dtag = $derived(data.dtag);
	const snapshot = $derived(data.snapshot as PostSnapshot | null);

	interface PostSnapshot {
		slug: string;
		event_id: string;
		created_at: number;
		published_at: number;
		title: string;
		summary: string;
		lang: string;
		cover_image: {
			url: string;
			fallback_url: string | null;
			alt: string | null;
		} | null;
		content_markdown: string;
		tags: string[];
		translations: { lang: string; slug: string; title: string }[];
	}

	let post: NostrEvent | null = $state(null);
	let loading = $state(true);
	let error: string | null = $state(null);

	const hablaLink = $derived(
		buildHablaLink({
			pubkey: AUTHOR_PUBKEY_HEX,
			kind: 30023,
			identifier: dtag
		})
	);

	$effect(() => {
		const currentDtag = dtag;
		if (snapshot && snapshot.slug === currentDtag) {
			loading = false;
			error = null;
			return;
		}
		// Fallback-Pfad: Slug wurde zur Build-Zeit nicht prerendered
		// (Nostr-first-Post, zwischen Snapshot und Browse publiziert).
		post = null;
		loading = true;
		error = null;
		loadPost(currentDtag)
			.then((p) => {
				if (currentDtag !== dtag) return;
				if (!p) {
					error = get(t)('post.not_found', { values: { slug: currentDtag } });
				} else {
					post = p;
				}
			})
			.catch((e) => {
				if (currentDtag !== dtag) return;
				error = e instanceof Error ? e.message : get(t)('post.unknown_error');
			})
			.finally(() => {
				if (currentDtag === dtag) loading = false;
			});
	});
</script>

<svelte:head>
	{#if snapshot}
		<title>{snapshot.title} – Jörg Lohrer</title>
		<meta name="description" content={snapshot.summary} />
		<meta property="og:type" content="article" />
		<meta property="og:title" content={snapshot.title} />
		<meta property="og:description" content={snapshot.summary} />
		<meta property="og:url" content={`https://joerg-lohrer.de/${snapshot.slug}/`} />
		<meta property="og:locale" content={snapshot.lang === 'en' ? 'en_US' : 'de_DE'} />
		{#if snapshot.cover_image}
			<meta property="og:image" content={snapshot.cover_image.url} />
			{#if snapshot.cover_image.alt}
				<meta property="og:image:alt" content={snapshot.cover_image.alt} />
			{/if}
		{/if}
		<meta property="article:published_time" content={new Date(snapshot.published_at * 1000).toISOString()} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={snapshot.title} />
		<meta name="twitter:description" content={snapshot.summary} />
		{#if snapshot.cover_image}
			<meta name="twitter:image" content={snapshot.cover_image.url} />
		{/if}
		<link rel="canonical" href={`https://joerg-lohrer.de/${snapshot.slug}/`} />
		{#each snapshot.translations as tr}
			<link rel="alternate" hreflang={tr.lang} href={`https://joerg-lohrer.de/${tr.slug}/`} />
		{/each}
		<link rel="alternate" hreflang={snapshot.lang} href={`https://joerg-lohrer.de/${snapshot.slug}/`} />
		{#if snapshot.lang !== 'de' && snapshot.translations.some((tr) => tr.lang === 'de')}
			<link rel="alternate" hreflang="x-default" href={`https://joerg-lohrer.de/${snapshot.translations.find((tr) => tr.lang === 'de')!.slug}/`} />
		{:else if snapshot.lang === 'de'}
			<link rel="alternate" hreflang="x-default" href={`https://joerg-lohrer.de/${snapshot.slug}/`} />
		{/if}
	{/if}
</svelte:head>

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

{#if snapshot}
	<PostView {snapshot} />
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
</style>
```

- [ ] **Step 2: `PostView.svelte` akzeptiert Snapshot-Quelle**

Öffne `app/src/lib/components/PostView.svelte`. Am Anfang des `<script>`-Blocks nach bestehenden Imports, ergänze die Prop-Definition und Snapshot-Unterstützung:

Ersetze den bestehenden Block:
```svelte
interface Props {
	event: NostrEvent;
}
let { event }: Props = $props();
```

durch:

```svelte
interface Snapshot {
	slug: string;
	title: string;
	summary: string;
	lang: string;
	published_at: number;
	cover_image: { url: string; fallback_url: string | null; alt: string | null } | null;
	content_markdown: string;
	tags: string[];
	translations: { lang: string; slug: string; title: string }[];
}

interface Props {
	event?: NostrEvent;
	snapshot?: Snapshot;
}
let { event, snapshot }: Props = $props();

function evTag(e: NostrEvent, name: string): string {
	return e.tags.find((t) => t[0] === name)?.[1] ?? '';
}
function evTagsAll(e: NostrEvent, name: string): string[] {
	return e.tags.filter((t) => t[0] === name).map((t) => t[1]);
}
```

Ersetze die bestehenden `tagValue`/`tagsAll`-Derivationen und Meta-Variablen durch einen Snapshot-zuerst-Pfad. Die bereits existierenden `$derived`-Zeilen (`dtag`, `title`, `summary`, `image`, `publishedAt`, `date`, `tags`, `bodyHtml`) werden ersetzt durch:

```svelte
const dtag = $derived(snapshot?.slug ?? (event ? evTag(event, 'd') : ''));
const title = $derived(snapshot?.title || (event ? evTag(event, 'title') : '') || $t('post.untitled'));
const summary = $derived(snapshot?.summary ?? (event ? evTag(event, 'summary') : ''));
const image = $derived(snapshot?.cover_image?.url ?? (event ? evTag(event, 'image') : ''));
const imageAlt = $derived(snapshot?.cover_image?.alt ?? 'Cover-Bild');
const publishedAt = $derived(
	snapshot?.published_at ??
		(event ? parseInt(evTag(event, 'published_at') || `${event.created_at}`, 10) : 0)
);
const contentMd = $derived(snapshot?.content_markdown ?? event?.content ?? '');
const tags = $derived(snapshot?.tags ?? (event ? evTagsAll(event, 't') : []));
const translations = $derived(snapshot?.translations ?? null);
const bodyHtml = $derived(renderMarkdown(contentMd));
```

(`date`-Variable und `currentLocale`-Sync bleiben wie bisher. Das `image`-`alt`-Attribut im Template auf `{imageAlt}` umstellen, falls vorher hardgecodet.)

Und `<Reactions {dtag} />`, `<ExternalClientLinks {dtag} />`, `<ReplyComposer …>`, `<ReplyList …>` bleiben im unteren Template-Bereich — die brauchen zwar das rohe Event, funktionieren aber nur im Snapshot-Modus mit `dtag`. Daher: im Template den Block bedingen:

```svelte
{#if dtag}
	<LanguageAvailability {translations} {snapshot} {event} />
	{#if event}
		<Reactions {dtag} />
		<ExternalClientLinks {dtag} />
		<ReplyComposer {dtag} eventId={event.id} onPublished={handlePublished} />
		<ReplyList {dtag} optimistic={optimisticReplies} />
	{/if}
{/if}
```

(Reactions/Replies brauchen weiterhin die Event-ID; im reinen Snapshot-Modus haben wir die event_id im Snapshot, können sie später ergänzen — für jetzt YAGNI, Reply-UI erscheint nur wenn Runtime-Event geladen ist.)

- [ ] **Step 3: `LanguageAvailability.svelte` liest `translations`-Prop**

Öffne `app/src/lib/components/LanguageAvailability.svelte`. Ersetze den Inhalt komplett durch:

```svelte
<script lang="ts">
	import type { NostrEvent, TranslationInfo } from '$lib/nostr/loaders';
	import { loadTranslations } from '$lib/nostr/loaders';
	import { activeLocale } from '$lib/i18n';
	import type { SupportedLocale } from '$lib/i18n/activeLocale';

	interface Snapshot {
		slug: string;
		lang: string;
		translations: { lang: string; slug: string; title: string }[];
	}

	interface Props {
		event?: NostrEvent;
		snapshot?: Snapshot;
		translations?: { lang: string; slug: string; title: string }[] | null;
	}
	let { event, snapshot, translations: translationsProp }: Props = $props();

	let translations: TranslationInfo[] = $state([]);
	let loading = $state(true);

	$effect(() => {
		// Prop-basiert (Snapshot): keine Relay-Abfrage nötig
		if (translationsProp) {
			translations = translationsProp.map((t) => ({ lang: t.lang, slug: t.slug, title: t.title }));
			loading = false;
			return;
		}
		if (snapshot) {
			translations = snapshot.translations.map((t) => ({ lang: t.lang, slug: t.slug, title: t.title }));
			loading = false;
			return;
		}
		if (!event) {
			translations = [];
			loading = false;
			return;
		}
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

	function currentLang(): string {
		if (snapshot) return snapshot.lang;
		if (event) return event.tags.find((tag) => tag[0] === 'l')?.[1] ?? 'de';
		return 'de';
	}

	interface Option {
		code: string;
		href: string | null;
	}

	const options = $derived.by<Option[]>(() => {
		const self: Option = { code: currentLang(), href: null };
		const others: Option[] = translations.map((t) => ({ code: t.lang, href: `/${t.slug}/` }));
		return [self, ...others.sort((a, b) => a.code.localeCompare(b.code))];
	});

	function selectOther(code: string, href: string) {
		activeLocale.set(code as SupportedLocale);
		window.location.href = href;
	}
</script>

{#if !loading && translations.length > 0}
	<p class="lang-switch" role="group" aria-label="Article language">
		<span class="icon" aria-hidden="true">📖</span>
		{#each options as opt, i}
			{#if opt.href === null}
				<span class="btn active" aria-current="true">{opt.code.toUpperCase()}</span>
			{:else}
				<button type="button" class="btn" onclick={() => selectOther(opt.code, opt.href!)}>{opt.code.toUpperCase()}</button>
			{/if}
			{#if i < options.length - 1}<span class="sep" aria-hidden="true">|</span>{/if}
		{/each}
	</p>
{/if}

<style>
	.lang-switch {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.88rem;
		color: var(--muted);
		margin: 0.25rem 0 1rem;
	}
	.icon {
		font-size: 1rem;
		line-height: 1;
	}
	.btn {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--muted);
		border-radius: 3px;
		padding: 1px 7px;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
	}
	.btn:hover:not(.active) {
		color: var(--fg);
	}
	.btn.active {
		color: var(--accent);
		border-color: var(--accent);
		cursor: default;
	}
	.sep {
		opacity: 0.4;
	}
</style>
```

- [ ] **Step 4: Typecheck + Tests + Build**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -10
```

Expected: 0 Errors, 44 Tests grün, Build erfolgreich. Build-Output enthält pro Slug ein Verzeichnis mit `index.html`, dessen `<head>` OG-Tags enthält.

Verify einer der Build-Outputs:
```bash
grep -E "og:title|og:image|og:description" /Users/joerglohrer/repositories/joerglohrerde/app/build/bibel-selfies/index.html | head
```
Expected: drei Treffer mit dem Post-Titel, Summary, Cover-Bild.

- [ ] **Step 5: Dev-Server und manuell prüfen**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run dev 2>&1 | head -5
```

Öffne `http://localhost:5173/bibel-selfies/`. Erwartet:
- Post rendert sofort (Snapshot-Modus).
- Sprach-Switcher erscheint.
- View-Source zeigt `<meta property="og:...">`.

Öffne `http://localhost:5173/nicht-existiert/`. Erwartet: Fallback-Pfad (Runtime-Fetch) läuft, zeigt „Post nicht gefunden".

Dev-Server stoppen.

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add 'app/src/routes/[...slug]/+page.svelte' app/src/lib/components/PostView.svelte app/src/lib/components/LanguageAvailability.svelte && git commit -m "feat(app): post-route rendert snapshot primär + OG/twitter/hreflang-tags"
```

---

## Task 15: JSON-LD-Schema einbauen

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`

- [ ] **Step 1: `Article`-Schema im `<svelte:head>`-Block ergänzen**

Im bestehenden `<svelte:head>`-Block (nach dem letzten `<link rel="alternate">`) ergänze:

```svelte
		{@html `<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Article',
			'headline': snapshot.title,
			'description': snapshot.summary,
			'datePublished': new Date(snapshot.published_at * 1000).toISOString(),
			'dateModified': new Date(snapshot.created_at * 1000).toISOString(),
			'author': {
				'@type': 'Person',
				'name': 'Jörg Lohrer',
				'url': 'https://joerg-lohrer.de/'
			},
			'image': snapshot.cover_image ? [snapshot.cover_image.url] : undefined,
			'inLanguage': snapshot.lang,
			'mainEntityOfPage': `https://joerg-lohrer.de/${snapshot.slug}/`
		})}</script>`}
```

**Wichtig:** Das `+page.svelte`-Snapshot-Interface braucht zusätzlich `created_at`. In der Interface-Definition `PostSnapshot` oben im Script:

```typescript
	interface PostSnapshot {
		slug: string;
		event_id: string;
		created_at: number;      // <-- hinzufügen falls fehlt
		published_at: number;
		title: string;
		summary: string;
		lang: string;
		cover_image: { url: string; fallback_url: string | null; alt: string | null } | null;
		content_markdown: string;
		tags: string[];
		translations: { lang: string; slug: string; title: string }[];
	}
```

- [ ] **Step 2: Build und Output inspizieren**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -5
grep "application/ld+json" /Users/joerglohrer/repositories/joerglohrerde/app/build/bibel-selfies/index.html
```

Expected: Treffer mit JSON-LD-Script-Tag.

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add 'app/src/routes/[...slug]/+page.svelte' && git commit -m "feat(app): json-ld article-schema im prerender-head"
```

---

## Task 16: Runtime-Relay-Fetch aus Detail-Seite entfernen (Migrations-Schritt 5)

**Files:**
- Modify: `app/src/routes/[...slug]/+page.svelte`

Vorbedingung: Alle produktiven Slugs sind aktuell im Snapshot enthalten. Andernfalls würden sie mit 404 reagieren.

- [ ] **Step 1: Smoke-Test — alle Live-Posts im Snapshot?**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task snapshot --out ./output
ls /Users/joerglohrer/repositories/joerglohrerde/snapshot/output/posts/ | wc -l
```

Expected: Zahl matcht `post_count` in `index.json`.

- [ ] **Step 2: Fallback-Code-Pfad entfernen**

In `app/src/routes/[...slug]/+page.svelte`:
- Entferne alle Variablen und Imports, die nur für den Fallback sind (`loadPost`, `post`-State, `loading`, `error`, der Fallback-`$effect` inkl. `.then/.catch/.finally`, `<LoadingOrError>`-Block).
- Entferne den `{#else}`-Zweig mit Runtime-Logik.

Nach der Änderung ist die Datei:

```svelte
<script lang="ts">
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
	import { buildHablaLink } from '$lib/nostr/naddr';
	import PostView from '$lib/components/PostView.svelte';
	import { t } from '$lib/i18n';

	let { data } = $props();
	const dtag = $derived(data.dtag);
	const snapshot = $derived(data.snapshot as PostSnapshot | null);

	interface PostSnapshot {
		slug: string;
		event_id: string;
		created_at: number;
		published_at: number;
		title: string;
		summary: string;
		lang: string;
		cover_image: { url: string; fallback_url: string | null; alt: string | null } | null;
		content_markdown: string;
		tags: string[];
		translations: { lang: string; slug: string; title: string }[];
	}

	const hablaLink = $derived(
		buildHablaLink({
			pubkey: AUTHOR_PUBKEY_HEX,
			kind: 30023,
			identifier: dtag
		})
	);
</script>

<svelte:head>
	{#if snapshot}
		<!-- ... OG/Twitter/JSON-LD unverändert ... -->
	{/if}
</svelte:head>

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

{#if snapshot}
	<PostView {snapshot} />
{:else}
	<p>Post nicht gefunden.</p>
	<p><a href={hablaLink}>Auf Habla.news öffnen</a></p>
{/if}
```

(Den `<svelte:head>`-Block nicht neu tippen — im Script und Template einfach die Runtime-Fallback-Teile entfernen.)

- [ ] **Step 3: `PostView`/`LanguageAvailability` Event-Prop optional entfernen**

Da `event` nicht mehr genutzt wird, kann aufgeräumt werden:

- `PostView.svelte`: `event`-Prop und alle Event-Spezifika (inkl. der bedingten Reactions/ReplyComposer-Blocks) bleiben vorerst — Replies sind weiterhin ein Runtime-Feature, die Composer/List-Komponenten laden selbst und brauchen nur `dtag`. **Aktion:** den `{#if event}`-Wrapper im Template durch `{#if dtag}` ersetzen und die `eventId={event.id}`-Prop auf `eventId={snapshot?.event_id ?? event?.id ?? ''}` umstellen.

- `LanguageAvailability.svelte`: `event`-Prop optional lassen (für Tests); Snapshot-Pfad ist Default.

- [ ] **Step 4: Build + Manuell**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -5
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run dev
```

Öffne `http://localhost:5173/bibel-selfies/`. Erwartet: Post rendert sofort (Snapshot-Modus), Replies-Bereich erscheint und lädt via Relay (ReplyList macht eigenen Fetch mit dtag).

Stoppe Dev-Server.

- [ ] **Step 5: Typecheck + Tests**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/app && npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -3
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run test:unit 2>&1 | tail -3
```

Expected: 0 Errors, 44 Tests grün.

- [ ] **Step 6: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add 'app/src/routes/[...slug]/+page.svelte' app/src/lib/components/PostView.svelte app/src/lib/components/LanguageAvailability.svelte && git commit -m "feat(app): runtime-relay-fetch in post-route entfernt, snapshot ist pflicht"
```

---

## Task 17: Deploy-Script in drei Phasen umbauen

**Files:**
- Modify: `scripts/deploy-svelte.sh`

Der bestehende Script lädt pro Datei einzeln via `curl`. Umbau auf `lftp` mit Phasen-Trennung — `lftp` ist auf macOS meist nicht vorinstalliert, daher erst prüfen.

- [ ] **Step 1: `lftp` prüfen/installieren**

```bash
which lftp || echo "MISSING"
```

Falls missing:

```bash
brew install lftp
```

Expected: `lftp` verfügbar (`which lftp` liefert einen Pfad).

- [ ] **Step 2: Script refactor**

Öffne `scripts/deploy-svelte.sh`. Ersetze den Block ab `echo "Lade Build von $BUILD_DIR nach ftp://$FTP_HOST$FTP_REMOTE_PATH"` bis zum `echo "Upload fertig. Live-Check:"` durch:

```bash
echo "Ziel: $TARGET ($PUBLIC_URL)"
echo "Phase 1/3: Assets (_app/**, Bilder, CSS) hochladen"

LFTP_OPTS="set ftps:initial-prot ''; set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate no"
LFTP_EXCLUDE="--exclude-glob .htaccess --exclude-glob .well-known"

# Phase 1: Assets (alles außer HTML) hochladen, kein Delete.
lftp -c "
  $LFTP_OPTS
  open -u '$FTP_USER','$FTP_PASS' ftps://$FTP_HOST
  mirror --reverse --parallel=4 --only-newer \
    --include-glob '_app/**' \
    --include-glob '*.css' \
    --include-glob '*.js' \
    --include-glob '*.png' \
    --include-glob '*.jpg' \
    --include-glob '*.webp' \
    --include-glob '*.svg' \
    --include-glob '*.ico' \
    '$BUILD_DIR' '$FTP_REMOTE_PATH'
"

echo "Phase 2/3: HTML-Seiten hochladen"
lftp -c "
  $LFTP_OPTS
  open -u '$FTP_USER','$FTP_PASS' ftps://$FTP_HOST
  mirror --reverse --parallel=4 --only-newer \
    --include-glob '*.html' \
    --include-glob '*.txt' \
    --include-glob '*.xml' \
    --include-glob '*.json' \
    '$BUILD_DIR' '$FTP_REMOTE_PATH'
"

echo "Phase 3/3: Obsolete Dateien löschen"
lftp -c "
  $LFTP_OPTS
  open -u '$FTP_USER','$FTP_PASS' ftps://$FTP_HOST
  mirror --reverse --delete --only-existing \
    $LFTP_EXCLUDE \
    '$BUILD_DIR' '$FTP_REMOTE_PATH'
"

echo "Upload fertig. Live-Check:"
```

**Begründung der Flags:**
- `--reverse` = Upload (lokal → remote), nicht Download.
- `--only-newer` in Phase 1+2 = nur geänderte Dateien neu hochladen.
- `--only-existing` in Phase 3 = nur löschen, keine neuen Uploads.
- `--delete` in Phase 3 = obsolete Remote-Dateien entfernen.
- `--exclude-glob` in Phase 3 = `.htaccess` und `.well-known/` nicht anfassen (werden extern verwaltet).

Falls `lftp`-Flags auf einem speziellen All-Inkl-FTPS-Modus nicht funktionieren (TLS-1.3-Problem), analog zum alten curl-Fix ergänzen:

```
set ssl:priority 'NORMAL:-VERS-TLS1.3'
```

in `LFTP_OPTS`.

- [ ] **Step 3: Testlauf auf Staging**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && DEPLOY_TARGET=staging ./scripts/deploy-svelte.sh 2>&1 | tail -20
```

Expected: Drei Phasen laufen der Reihe nach durch, `HTTP/2 200` am Ende.

- [ ] **Step 4: Live-Check auf Staging**

```bash
curl -sI https://staging.joerg-lohrer.de/bibel-selfies/
curl -s https://staging.joerg-lohrer.de/bibel-selfies/ | grep -E "og:title|og:image"
```

Expected: `HTTP/2 200`, OG-Tags sichtbar.

- [ ] **Step 5: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add scripts/deploy-svelte.sh && git commit -m "feat(deploy): lftp-drei-phasen-sync (assets → html → delete)"
```

---

## Task 18: Prod-Deploy + Live-Verifikation

**Files:** — (Verifikation)

- [ ] **Step 1: Snapshot + Build lokal**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde/snapshot && deno task snapshot --out ./output
cd /Users/joerglohrer/repositories/joerglohrerde/app && npm run build 2>&1 | tail -5
```

- [ ] **Step 2: Deploy nach prod**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh 2>&1 | tail -15
```

Expected: Alle drei Phasen OK, Live-Check HTTP 200.

- [ ] **Step 3: Verifikation — OG-Tags im ausgelieferten HTML**

```bash
curl -s https://joerg-lohrer.de/bibel-selfies/ | grep -E "og:title|og:description|og:image|application/ld\+json" | head -5
```

Expected: Post-Titel und -Summary im HTML-Quelltext sichtbar, JSON-LD vorhanden.

- [ ] **Step 4: Social-Preview-Test**

Manuell:
- LinkedIn-Inspect-Tool: https://www.linkedin.com/post-inspector/ → Input `https://joerg-lohrer.de/bibel-selfies/` → Preview zeigt Titel, Beschreibung, Cover-Bild.
- Facebook-Debugger: https://developers.facebook.com/tools/debug/ → analog.
- Bluesky/Mastodon: Link in Testpost einfügen, Preview prüfen.

Alle sollten jetzt post-spezifische Tags zeigen statt Homepage-Defaults.

- [ ] **Step 5: Kein Commit nötig — Abschluss-Verifikation.**

---

## Task 19: Snapshot in CI einbauen (optional, aber empfohlen)

**Files:**
- Modify: `.github/workflows/publish.yml`

Optional: Der Snapshot-Lauf kann in CI triggert werden, damit auch Nostr-first-Posts automatisch in den nächsten Build eingehen. Der Snapshot selbst triggert keine Action — er muss von außen aufgerufen werden. Zwei Optionen:

**Option A:** Snapshot nur zum Deploy-Zeitpunkt lokal. Simpel. Reicht, solange fast alles git-first läuft.

**Option B:** Neuen Workflow `snapshot-and-deploy.yml` mit `workflow_dispatch`-Trigger, damit Jörg manuell „jetzt snapshotten" aus GitHub UI starten kann. Ebenfalls `cron: '0 3 * * *'` für täglichen Snapshot.

Empfehlung: **Option A jetzt**, Option B später wenn Bedarf entsteht. Diese Task ist also dokumentarisch:

- [ ] **Step 1: `docs/HANDOFF.md` dokumentiert Snapshot-Lauf**

Ergänze im HANDOFF-Abschnitt „Dev-Kommandos" vor der Deploy-Zeile:

```sh
# Snapshot (kind:30023 aus Relays → snapshot/output/)
cd snapshot && deno task snapshot

# SPA-Build + Deploy (Snapshot muss vorher laufen)
DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh
```

Und einen Absatz weiter oben (im Alltags-Workflow):

```markdown
### Vollständiger Prod-Deploy-Flow

1. Content ändern oder neuen Post committen
2. `git push` → GitHub-Action publisht das Event auf die Relays
3. Warten bis Action durch ist (typisch < 1 min nach Mirror-Sync)
4. Lokal: `cd snapshot && deno task snapshot` — Relays → JSON
5. Lokal: `cd app && npm run build` — JSON → Build
6. `DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh` — Upload
```

- [ ] **Step 2: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add docs/HANDOFF.md && git commit -m "docs: snapshot → build → deploy flow im handoff dokumentiert"
```

---

## Task 20: `CLAUDE.md` aktualisieren

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Hauptarbeitsbereiche erweitern**

In `CLAUDE.md` den Abschnitt „Hauptarbeitsbereiche im Repo" erweitern:

```markdown
| `snapshot/src/` | Deno-Snapshot-Tool (Relays → JSON, für Prerender) |
| `snapshot/tests/` | Deno-Tests des Snapshot-Tools |
| `snapshot/output/` | Generated (gitignored) — Input für SvelteKit-Prerender |
```

- [ ] **Step 2: Neuer Fallstrick-Absatz**

Am Ende von „Kritische Fallstricke" ergänzen:

```markdown
### 6. Build setzt aktuellen Snapshot voraus

`app/src/routes/[...slug]/+page.ts` liest `snapshot/output/posts/*.json`
zur Build-Zeit. Vor `npm run build` muss `cd snapshot && deno task
snapshot` gelaufen sein — sonst erzeugt SvelteKit nur die Default-Route
ohne Post-Seiten. Der Deploy-Flow ist: **publish (git push) → snapshot
→ build → deploy**.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/joerglohrer/repositories/joerglohrerde && git add CLAUDE.md && git commit -m "docs: CLAUDE.md um snapshot-stufe und build-vorbedingung ergänzt"
```

---

## Fertig

Nach Task 20:

- `snapshot/` als eigenständiges Deno-Modul mit 6 Core-Dateien + Tests, ~35 Unit-Tests grün.
- JSON-Output in `snapshot/output/` als stabile Schnittstelle, Blaupausen-tauglich.
- SvelteKit prerendert pro Slug eine statische HTML-Datei mit vollständigen OG-/Twitter-/JSON-LD-Tags und `hreflang`-Links.
- Laufzeit-Relay-Fetch der Detail-Seite entfernt, Replies/Reactions bleiben client-gerendert.
- Deploy-Script in 3 Phasen (Assets → HTML → Delete), konsistenzsicher auch bei Hash-Bundle-Rotation.
- Dokumentation in `CLAUDE.md` und `docs/HANDOFF.md` ergänzt.

**Nicht Teil dieses Plans:**

- Prerender für Listen-Seiten (Spec-Nicht-Ziel).
- Snapshot-Automatisierung in CI (Option B, später bei Bedarf).
- `fallback_url`-Nutzung im `<img>` mit `onerror`-Handler — bleibt YAGNI-Entscheidung für später.
