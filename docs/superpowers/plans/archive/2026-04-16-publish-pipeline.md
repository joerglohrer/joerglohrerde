# Publish-Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Deno-basierte Toolchain bauen, die Markdown-Posts aus `content/posts/*/index.md` in signierte `kind:30023`-Events umwandelt, alle Bilder zu Blossom hochlädt und die Events zu Public-Relays publisht — sowohl lokal per CLI als auch automatisch per GitHub Action beim Push auf `main`.

**Architecture:** Gemeinsame Library (`src/core/`) + CLI-Entrypoint (`src/cli.ts`) + Subcommands (`src/subcommands/`). Signatur via NIP-46-Bunker (Amber), Config aus Nostr (`kind:10002` Relays, `kind:10063` Blossom), Change-Detection via Git-Diff. State-los im Repo, keine Lock-Files. **Einheitlicher Upload-Pfad:** alle Bilder (Alt- wie Neuposts) landen auf Blossom. Kein rsync, kein Legacy-Pfad.

**Blaupausen-Prinzip:** Der Code enthält **keine** projekt-spezifischen Konstanten. Alle Werte (Pubkey, Relay, Content-Pfad, Client-Tag) kommen aus Env-Variablen. `publish/` ist als eigenständiges Verzeichnis gedacht, das in andere Nostr-Repos per Submodule oder Template übernommen werden kann.

**Tech Stack:** Deno 2.x, TypeScript, `applesauce-signers` (NIP-46), `applesauce-relay` (RxJS), `nostr-tools` (Event-Bau/Verify), `@std/yaml`, `@std/cli`, `@std/fs`, `@std/path`, `@std/testing`. Zielordner: `publish/` auf Repo-Root.

---

## Phase 1 — Projekt-Setup

### Task 1: Deno-Projekt-Grundgerüst

**Files:**
- Create: `publish/deno.jsonc`
- Create: `publish/.gitignore`
- Create: `publish/.env.example`
- Create: `publish/README.md`

**Env-Handling:** Die Pipeline liest ausschließlich aus Env-Variablen — keine hardcoded Projekt-Konstanten im Code. Lade-Reihenfolge (Deno 2.x lädt die erste existierende Datei):

1. `publish/.env` — lokale Publish-Config (gitignored, Template: `publish/.env.example`).
2. Fallback: `../.env.local` im Repo-Root, falls vorhanden (für Repos, die schon eine `.env.local` pflegen).
3. In CI: GitHub-Actions-Secrets werden als Prozess-Env injiziert.

Für dieses Projekt existiert bereits `../.env.local` mit `BUNKER_URL`, `AUTHOR_PUBKEY_HEX`, `BOOTSTRAP_RELAY`. Die Pipeline-`deno.jsonc` nutzt primär `../.env.local` per `--env-file`. In einem Fremd-Repo, das `publish/` einbindet, würde stattdessen `publish/.env` angelegt und der `--env-file`-Pfad angepasst (oder `.env.example` kopiert).

- [ ] **Step 1: Verzeichnis anlegen und `deno.jsonc` schreiben**

`publish/deno.jsonc`:

```jsonc
{
  "tasks": {
    "publish": "deno run --env-file=../.env.local --allow-env --allow-read --allow-write=./logs --allow-net --allow-run=git src/cli.ts publish",
    "check": "deno run --env-file=../.env.local --allow-env --allow-read --allow-net src/cli.ts check",
    "validate-post": "deno run --allow-read src/cli.ts validate-post",
    "test": "deno test --allow-env --allow-read --allow-net --allow-run",
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
    "applesauce-signers": "npm:applesauce-signers@^2.0.0",
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

- [ ] **Step 2: `publish/.gitignore` schreiben**

```
.env
logs/
```

- [ ] **Step 3: `publish/.env.example` schreiben (Template für Fremd-Repos)**

```
# ==== PFLICHT ====

# NIP-46-Bunker-URL vom Signer (Amber, nak bunker, nsite.run, …)
BUNKER_URL=bunker://<hex>?relay=wss://...&secret=...

# Autor-Pubkey als 64 Zeichen lowercase hex (entspricht dem Bunker-Account)
AUTHOR_PUBKEY_HEX=

# Bootstrap-Relay zum Laden von kind:10002 und kind:10063
BOOTSTRAP_RELAY=wss://relay.damus.io

# ==== OPTIONAL ====

# Wurzel der Markdown-Posts, relativ zu diesem publish/-Ordner.
# Default: ../content/posts
CONTENT_ROOT=../content/posts

# Wird als ["client", "<wert>"]-Tag in jedes kind:30023-Event eingetragen.
# Hilft bei der Zuordnung der Event-Herkunft. Default: joerglohrerde-publish
CLIENT_TAG=joerglohrerde-publish

# Minimal geforderte Relay-ACKs pro Post (default: 2)
MIN_RELAY_ACKS=2
```

- [ ] **Step 4: `publish/README.md` schreiben**

```markdown
# publish — Nostr-Publish-Pipeline

Markdown-Posts aus einem Hugo-ähnlichen Content-Ordner zu `kind:30023`-Events,
Bilder zu Blossom, Signatur via NIP-46-Bunker.

Blaupause für Nostr-Repos: keinerlei Projekt-Konstanten im Code, alles über
Env-Variablen konfigurierbar.

## Setup

1. `cp .env.example .env` und Werte eintragen.
2. Oder: `.env.local` im Eltern-Ordner pflegen und `deno.jsonc` anpassen
   (siehe `--env-file=../.env.local`-Tasks).
3. `deno task check` — verifiziert Bunker, Relay-Liste, Blossom-Server.

## Befehle

- `deno task publish` — Git-Diff-Modus: publisht nur geänderte Posts.
- `deno task publish --force-all` — alle Posts (Migration / Reimport).
- `deno task publish --post <slug>` — nur ein Post.
- `deno task publish --dry-run` — zeigt, was publiziert würde, ohne Uploads.
- `deno task validate-post content/posts/<ordner>/index.md` — Frontmatter-Check.
- `deno task test` — Tests.

## Struktur

- `src/core/` — Library (Frontmatter, Markdown, Events, Signer, Relays, Blossom).
- `src/subcommands/` — CLI-Befehle.
- `src/cli.ts` — Entrypoint, Subcommand-Dispatcher.
- `tests/` — Unit- und Integration-Tests.
- `.github/workflows/publish.yml` — CI-Workflow.
```

- [ ] **Step 5: Verifikation + Commit**

Run: `cd publish && deno fmt --check deno.jsonc`
Expected: PASS (kein Output)

```bash
git add publish/deno.jsonc publish/.gitignore publish/.env.example publish/README.md
git commit -m "publish(task 1): deno-grundgerüst (deno.jsonc, .env.example, readme)"
```

---

### Task 2: Config-Modul mit Env-Loader

**Files:**
- Create: `publish/src/core/config.ts`
- Create: `publish/tests/config_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/config_test.ts`:

```typescript
import { assertEquals, assertThrows } from '@std/assert'
import { loadConfig } from '../src/core/config.ts'

const REQUIRED = {
  BUNKER_URL: 'bunker://abc?relay=wss://r.example&secret=s',
  AUTHOR_PUBKEY_HEX: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
  BOOTSTRAP_RELAY: 'wss://relay.damus.io',
}

Deno.test('loadConfig: liest alle pflicht-keys aus env', () => {
  const cfg = loadConfig((k) => REQUIRED[k as keyof typeof REQUIRED])
  assertEquals(cfg.bunkerUrl, REQUIRED.BUNKER_URL)
  assertEquals(cfg.authorPubkeyHex, REQUIRED.AUTHOR_PUBKEY_HEX)
  assertEquals(cfg.bootstrapRelay, REQUIRED.BOOTSTRAP_RELAY)
})

Deno.test('loadConfig: liefert defaults für optionale keys', () => {
  const cfg = loadConfig((k) => REQUIRED[k as keyof typeof REQUIRED])
  assertEquals(cfg.contentRoot, '../content/posts')
  assertEquals(cfg.clientTag, 'nostr-publish-pipeline')
  assertEquals(cfg.minRelayAcks, 2)
})

Deno.test('loadConfig: optionale keys können überschrieben werden', () => {
  const env = {
    ...REQUIRED,
    CONTENT_ROOT: '../blog',
    CLIENT_TAG: 'my-site',
    MIN_RELAY_ACKS: '3',
  }
  const cfg = loadConfig((k) => env[k as keyof typeof env])
  assertEquals(cfg.contentRoot, '../blog')
  assertEquals(cfg.clientTag, 'my-site')
  assertEquals(cfg.minRelayAcks, 3)
})

Deno.test('loadConfig: wirft bei fehlender pflicht-variable', () => {
  assertThrows(() => loadConfig(() => undefined), Error, 'BUNKER_URL')
})

Deno.test('loadConfig: validiert pubkey-format (64 hex)', () => {
  const env = { ...REQUIRED, AUTHOR_PUBKEY_HEX: 'zzz' }
  assertThrows(
    () => loadConfig((k) => env[k as keyof typeof env]),
    Error,
    'AUTHOR_PUBKEY_HEX',
  )
})

Deno.test('loadConfig: MIN_RELAY_ACKS muss positiv sein', () => {
  const env = { ...REQUIRED, MIN_RELAY_ACKS: '0' }
  assertThrows(
    () => loadConfig((k) => env[k as keyof typeof env]),
    Error,
    'MIN_RELAY_ACKS',
  )
})
```

- [ ] **Step 2: Test lässt sich nicht laufen (Modul fehlt)**

Run: `cd publish && deno test tests/config_test.ts`
Expected: FAIL — "Module not found"

- [ ] **Step 3: `publish/src/core/config.ts` schreiben**

```typescript
export interface Config {
  bunkerUrl: string
  authorPubkeyHex: string
  bootstrapRelay: string
  contentRoot: string
  clientTag: string
  minRelayAcks: number
}

type EnvReader = (key: string) => string | undefined

const REQUIRED = ['BUNKER_URL', 'AUTHOR_PUBKEY_HEX', 'BOOTSTRAP_RELAY'] as const

const DEFAULTS = {
  CONTENT_ROOT: '../content/posts',
  CLIENT_TAG: 'nostr-publish-pipeline',
  MIN_RELAY_ACKS: '2',
}

export function loadConfig(read: EnvReader = (k) => Deno.env.get(k)): Config {
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
  const minAcksRaw = read('MIN_RELAY_ACKS') ?? DEFAULTS.MIN_RELAY_ACKS
  const minAcks = Number(minAcksRaw)
  if (!Number.isInteger(minAcks) || minAcks < 1) {
    throw new Error(`MIN_RELAY_ACKS must be a positive integer, got "${minAcksRaw}"`)
  }
  return {
    bunkerUrl: values.BUNKER_URL,
    authorPubkeyHex: values.AUTHOR_PUBKEY_HEX,
    bootstrapRelay: values.BOOTSTRAP_RELAY,
    contentRoot: read('CONTENT_ROOT') ?? DEFAULTS.CONTENT_ROOT,
    clientTag: read('CLIENT_TAG') ?? DEFAULTS.CLIENT_TAG,
    minRelayAcks: minAcks,
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd publish && deno test tests/config_test.ts`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/config.ts publish/tests/config_test.ts
git commit -m "publish(task 2): config-loader mit env-validation"
```

---

## Phase 2 — Pure Transformationen (Frontmatter, Markdown, Events)

### Task 3: Frontmatter-Parser

**Files:**
- Create: `publish/src/core/frontmatter.ts`
- Create: `publish/tests/frontmatter_test.ts`
- Create: `publish/tests/fixtures/sample-post.md`

- [ ] **Step 1: Fixture `publish/tests/fixtures/sample-post.md` anlegen**

```markdown
---
layout: post
title: "Sample Title"
slug: "sample-slug"
description: "A short summary"
image: cover.png
cover:
  image: cover.png
  alt: "Alt text"
date: 2024-01-15
tags: ["Foo", "Bar"]
draft: false
---

Body content here.

![pic](image1.jpg)
```

- [ ] **Step 2: Test schreiben**

`publish/tests/frontmatter_test.ts`:

```typescript
import { assertEquals, assertThrows } from '@std/assert'
import { parseFrontmatter } from '../src/core/frontmatter.ts'

Deno.test('parseFrontmatter: zerlegt Frontmatter und Body', async () => {
  const md = await Deno.readTextFile('./tests/fixtures/sample-post.md')
  const { fm, body } = parseFrontmatter(md)
  assertEquals(fm.title, 'Sample Title')
  assertEquals(fm.slug, 'sample-slug')
  assertEquals(fm.date instanceof Date, true)
  assertEquals(fm.tags, ['Foo', 'Bar'])
  assertEquals(fm.cover?.image, 'cover.png')
  assertEquals(body.trim().startsWith('Body content here.'), true)
})

Deno.test('parseFrontmatter: wirft bei fehlendem Frontmatter', () => {
  assertThrows(() => parseFrontmatter('no frontmatter here'), Error, 'Frontmatter')
})

Deno.test('parseFrontmatter: wirft bei unvollständigem Frontmatter', () => {
  assertThrows(() => parseFrontmatter('---\ntitle: x\n'), Error, 'Frontmatter')
})

Deno.test('parseFrontmatter: erhält Leerzeichen in String-Werten', () => {
  const md = '---\ntitle: "Hello World"\nslug: "h-w"\ndate: 2024-01-01\n---\n\nbody'
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.title, 'Hello World')
})
```

- [ ] **Step 3: Test verifiziert FAIL**

Run: `cd publish && deno test tests/frontmatter_test.ts`
Expected: FAIL — Module not found

- [ ] **Step 4: `publish/src/core/frontmatter.ts` schreiben**

```typescript
import { parse as parseYaml } from '@std/yaml'

export interface Frontmatter {
  title: string
  slug: string
  date: Date
  description?: string
  image?: string
  cover?: { image?: string; alt?: string; caption?: string }
  tags?: string[]
  draft?: boolean
  [key: string]: unknown
}

export function parseFrontmatter(md: string): { fm: Frontmatter; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    throw new Error('Frontmatter: no leading --- / --- block found')
  }
  const fm = parseYaml(match[1]) as Frontmatter
  if (!fm || typeof fm !== 'object') {
    throw new Error('Frontmatter: YAML did not produce an object')
  }
  return { fm, body: match[2] }
}
```

- [ ] **Step 5: Tests laufen**

Run: `cd publish && deno test tests/frontmatter_test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 6: Commit**

```bash
git add publish/src/core/frontmatter.ts publish/tests/frontmatter_test.ts publish/tests/fixtures/sample-post.md
git commit -m "publish(task 3): frontmatter-parser mit yaml + body-split"
```

---

### Task 4: Slug-Validator und Post-Validator

**Files:**
- Create: `publish/src/core/validation.ts`
- Create: `publish/tests/validation_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/validation_test.ts`:

```typescript
import { assertEquals, assertThrows } from '@std/assert'
import { validatePost, validateSlug } from '../src/core/validation.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

Deno.test('validateSlug: akzeptiert lowercase/digits/hyphen', () => {
  validateSlug('abc-123')
  validateSlug('a')
  validateSlug('dezentrale-oep-oer')
})

Deno.test('validateSlug: lehnt Großbuchstaben ab', () => {
  assertThrows(() => validateSlug('Abc'), Error, 'slug')
})

Deno.test('validateSlug: lehnt Unterstriche/Leerzeichen ab', () => {
  assertThrows(() => validateSlug('a_b'), Error, 'slug')
  assertThrows(() => validateSlug('a b'), Error, 'slug')
})

Deno.test('validateSlug: lehnt führenden Bindestrich ab', () => {
  assertThrows(() => validateSlug('-abc'), Error, 'slug')
})

Deno.test('validatePost: ok bei vollständigem Frontmatter', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 'ok-slug',
    date: new Date('2024-01-01'),
  }
  validatePost(fm)
})

Deno.test('validatePost: fehlt title', () => {
  const fm = { slug: 'ok', date: new Date() } as unknown as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'title')
})

Deno.test('validatePost: date muss Date sein', () => {
  const fm = { title: 'T', slug: 'ok', date: 'not-a-date' } as unknown as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'date')
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/validation_test.ts`
Expected: FAIL — Module not found

- [ ] **Step 3: `publish/src/core/validation.ts` schreiben**

```typescript
import type { Frontmatter } from './frontmatter.ts'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export function validateSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`invalid slug: "${slug}" (must match ${SLUG_RE})`)
  }
}

export function validatePost(fm: Frontmatter): void {
  if (!fm.title || typeof fm.title !== 'string') {
    throw new Error('missing/invalid title')
  }
  if (!fm.slug || typeof fm.slug !== 'string') {
    throw new Error('missing/invalid slug')
  }
  validateSlug(fm.slug)
  if (!(fm.date instanceof Date) || isNaN(fm.date.getTime())) {
    throw new Error('missing/invalid date (expected YAML date)')
  }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/validation_test.ts`
Expected: PASS (7 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/validation.ts publish/tests/validation_test.ts
git commit -m "publish(task 4): slug- und post-validation"
```

---

### Task 5: Markdown-Bild-URL-Rewriter

**Files:**
- Create: `publish/src/core/markdown.ts`
- Create: `publish/tests/markdown_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/markdown_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { rewriteImageUrls } from '../src/core/markdown.ts'

Deno.test('rewriteImageUrls: ersetzt ![alt](file) durch Mapping', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](cat.png)'
  assertEquals(rewriteImageUrls(input, mapping), '![cat](https://blossom.example/hash.png)')
})

Deno.test('rewriteImageUrls: absolute URL bleibt unverändert', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](https://other.com/cat.png)'
  assertEquals(rewriteImageUrls(input, mapping), input)
})

Deno.test('rewriteImageUrls: entfernt =WxH-Suffix', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](cat.png =300x200)'
  assertEquals(rewriteImageUrls(input, mapping), '![cat](https://blossom.example/hash.png)')
})

Deno.test('rewriteImageUrls: bild-in-link [![alt](file)](link)', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '[![cat](cat.png)](https://target.example.com)'
  assertEquals(
    rewriteImageUrls(input, mapping),
    '[![cat](https://blossom.example/hash.png)](https://target.example.com)',
  )
})

Deno.test('rewriteImageUrls: mehrere Bilder im Text', () => {
  const mapping = new Map([
    ['a.png', 'https://bl/a-hash.png'],
    ['b.jpg', 'https://bl/b-hash.jpg'],
  ])
  const input = 'Text ![a](a.png) more ![b](b.jpg) end'
  assertEquals(
    rewriteImageUrls(input, mapping),
    'Text ![a](https://bl/a-hash.png) more ![b](https://bl/b-hash.jpg) end',
  )
})

Deno.test('rewriteImageUrls: lässt unbekannte Dateinamen stehen', () => {
  const mapping = new Map([['cat.png', 'https://bl/c.png']])
  const input = '![x](missing.jpg)'
  assertEquals(rewriteImageUrls(input, mapping), input)
})

Deno.test('rewriteImageUrls: URL-Dekodierung für Leerzeichen-Namen', () => {
  const mapping = new Map([['file with spaces.png', 'https://bl/hash.png']])
  const input = '![x](file%20with%20spaces.png)'
  assertEquals(rewriteImageUrls(input, mapping), '![x](https://bl/hash.png)')
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/markdown_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/markdown.ts` schreiben**

```typescript
const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+=\d+x\d+)?\)/g

function isAbsolute(url: string): boolean {
  return /^(https?:)?\/\//i.test(url)
}

export function rewriteImageUrls(md: string, mapping: Map<string, string>): string {
  return md.replace(IMG_RE, (full, alt: string, url: string) => {
    if (isAbsolute(url)) return full.replace(/\s+=\d+x\d+\)$/, ')')
    let decoded: string
    try {
      decoded = decodeURIComponent(url)
    } catch {
      decoded = url
    }
    const target = mapping.get(decoded) ?? mapping.get(url)
    if (!target) return full.replace(/\s+=\d+x\d+\)$/, ')')
    return `![${alt}](${target})`
  })
}

export function resolveCoverUrl(
  coverRaw: string | undefined,
  mapping: Map<string, string>,
): string | undefined {
  if (!coverRaw) return undefined
  if (isAbsolute(coverRaw)) return coverRaw
  return mapping.get(coverRaw)
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/markdown_test.ts`
Expected: PASS (7 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/markdown.ts publish/tests/markdown_test.ts
git commit -m "publish(task 5): markdown bild-url-rewriter (mapping-basiert, =WxH-strip)"
```

---

### Task 6: `buildKind30023`-Event-Builder

**Files:**
- Create: `publish/src/core/event.ts`
- Create: `publish/tests/event_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/event_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { buildKind30023 } from '../src/core/event.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

const PUBKEY = '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41'

Deno.test('buildKind30023: minimaler Post liefert alle Pflicht-Tags', () => {
  const fm: Frontmatter = {
    title: 'Hello',
    slug: 'hello',
    date: new Date('2024-01-15T00:00:00Z'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body text',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: 'test-client',
    nowSeconds: 1_700_000_000,
  })
  assertEquals(ev.kind, 30023)
  assertEquals(ev.pubkey, PUBKEY)
  assertEquals(ev.created_at, 1_700_000_000)
  assertEquals(ev.content, 'body text')
  const tags = ev.tags
  assertEquals(tags.find((t) => t[0] === 'd'), ['d', 'hello'])
  assertEquals(tags.find((t) => t[0] === 'title'), ['title', 'Hello'])
  assertEquals(
    tags.find((t) => t[0] === 'published_at')?.[1],
    String(Math.floor(Date.UTC(2024, 0, 15) / 1000)),
  )
  assertEquals(tags.find((t) => t[0] === 'client'), ['client', 'test-client'])
})

Deno.test('buildKind30023: mapping summary / image / tags', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
    description: 'Summary text',
    tags: ['Foo', 'Bar Baz'],
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: 'https://bl.example/cover-hash.png',
    pubkeyHex: PUBKEY,
    clientTag: 'x',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.find((t) => t[0] === 'summary'), ['summary', 'Summary text'])
  assertEquals(ev.tags.find((t) => t[0] === 'image'), ['image', 'https://bl.example/cover-hash.png'])
  assertEquals(
    ev.tags.filter((t) => t[0] === 't'),
    [['t', 'Foo'], ['t', 'Bar Baz']],
  )
})

Deno.test('buildKind30023: ohne coverUrl kein image-tag', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: 'x',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.some((t) => t[0] === 'image'), false)
})

Deno.test('buildKind30023: leerer clientTag wird weggelassen', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: '',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.some((t) => t[0] === 'client'), false)
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/event_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/event.ts` schreiben**

```typescript
import type { Frontmatter } from './frontmatter.ts'

export interface UnsignedEvent {
  kind: number
  pubkey: string
  created_at: number
  tags: string[][]
  content: string
}

export interface BuildArgs {
  fm: Frontmatter
  rewrittenBody: string
  coverUrl: string | undefined
  pubkeyHex: string
  clientTag: string
  nowSeconds: number
}

export function buildKind30023(args: BuildArgs): UnsignedEvent {
  const { fm, rewrittenBody, coverUrl, pubkeyHex, clientTag, nowSeconds } = args
  const publishedAt = Math.floor(fm.date.getTime() / 1000)
  const tags: string[][] = [
    ['d', fm.slug],
    ['title', fm.title],
    ['published_at', String(publishedAt)],
  ]
  if (fm.description) tags.push(['summary', fm.description])
  if (coverUrl) tags.push(['image', coverUrl])
  if (Array.isArray(fm.tags)) {
    for (const t of fm.tags) tags.push(['t', String(t)])
  }
  if (clientTag) tags.push(['client', clientTag])
  return {
    kind: 30023,
    pubkey: pubkeyHex,
    created_at: nowSeconds,
    tags,
    content: rewrittenBody,
  }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/event_test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/event.ts publish/tests/event_test.ts
git commit -m "publish(task 6): kind:30023 event-builder mit tag-mapping"
```

---

## Phase 3 — Nostr-Infrastruktur (Relays, Signer)

### Task 7: Relay-Pool-Wrapper (publish)

**Files:**
- Create: `publish/src/core/relays.ts`
- Create: `publish/tests/relays_test.ts`

- [ ] **Step 1: Test schreiben (mit injizierter publish-Funktion)**

`publish/tests/relays_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { publishToRelays } from '../src/core/relays.ts'

Deno.test('publishToRelays: meldet OK-Antworten je relay', async () => {
  const injected = async (url: string, _ev: unknown) => {
    if (url.includes('fail')) return { ok: false, reason: 'nope' }
    return { ok: true }
  }
  const result = await publishToRelays(
    ['wss://ok1.example', 'wss://ok2.example', 'wss://fail.example'],
    { kind: 1, pubkey: 'p', created_at: 1, tags: [], content: 'x', id: 'i', sig: 's' },
    { publishFn: injected, retries: 0, timeoutMs: 100 },
  )
  assertEquals(result.ok.sort(), ['wss://ok1.example', 'wss://ok2.example'])
  assertEquals(result.failed, ['wss://fail.example'])
})

Deno.test('publishToRelays: retry bei Fehler', async () => {
  let attempts = 0
  const injected = async () => {
    attempts++
    if (attempts < 2) return { ok: false, reason: 'transient' }
    return { ok: true }
  }
  const result = await publishToRelays(
    ['wss://flaky.example'],
    { kind: 1, pubkey: 'p', created_at: 1, tags: [], content: 'x', id: 'i', sig: 's' },
    { publishFn: injected, retries: 1, timeoutMs: 100, backoffMs: 1 },
  )
  assertEquals(result.ok, ['wss://flaky.example'])
  assertEquals(attempts, 2)
})

Deno.test('publishToRelays: timeout → failed', async () => {
  const injected = () =>
    new Promise<{ ok: boolean }>((resolve) => setTimeout(() => resolve({ ok: true }), 500))
  const result = await publishToRelays(
    ['wss://slow.example'],
    { kind: 1, pubkey: 'p', created_at: 1, tags: [], content: 'x', id: 'i', sig: 's' },
    { publishFn: injected, retries: 0, timeoutMs: 10 },
  )
  assertEquals(result.failed, ['wss://slow.example'])
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/relays_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/relays.ts` schreiben**

```typescript
import { Relay, RelayPool } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'

export interface SignedEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface PublishResult {
  ok: boolean
  reason?: string
}

export type PublishFn = (url: string, ev: SignedEvent) => Promise<PublishResult>

export interface PublishOptions {
  publishFn?: PublishFn
  retries?: number
  timeoutMs?: number
  backoffMs?: number
}

export interface RelaysReport {
  ok: string[]
  failed: string[]
}

const defaultPool = new RelayPool((url) => new Relay(url))

const defaultPublish: PublishFn = async (url, ev) => {
  try {
    const relay = defaultPool.relay(url)
    const result = await firstValueFrom(relay.publish(ev).pipe(timeout({ first: 10_000 })))
    return { ok: result.ok, reason: result.message }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

async function publishOne(
  url: string,
  ev: SignedEvent,
  opts: Required<PublishOptions>,
): Promise<boolean> {
  const total = opts.retries + 1
  for (let i = 0; i < total; i++) {
    const attempt = Promise.race([
      opts.publishFn(url, ev),
      new Promise<PublishResult>((resolve) =>
        setTimeout(() => resolve({ ok: false, reason: 'timeout' }), opts.timeoutMs)
      ),
    ])
    const res = await attempt
    if (res.ok) return true
    if (i < total - 1) await new Promise((r) => setTimeout(r, opts.backoffMs * Math.pow(3, i)))
  }
  return false
}

export async function publishToRelays(
  urls: string[],
  ev: SignedEvent,
  options: PublishOptions = {},
): Promise<RelaysReport> {
  const opts: Required<PublishOptions> = {
    publishFn: options.publishFn ?? defaultPublish,
    retries: options.retries ?? 2,
    timeoutMs: options.timeoutMs ?? 10_000,
    backoffMs: options.backoffMs ?? 1000,
  }
  const results = await Promise.all(
    urls.map(async (url) => ({ url, ok: await publishOne(url, ev, opts) })),
  )
  return {
    ok: results.filter((r) => r.ok).map((r) => r.url),
    failed: results.filter((r) => !r.ok).map((r) => r.url),
  }
}

export type ExistingQuery = (url: string, pubkey: string, slug: string) => Promise<boolean>

const defaultExistingQuery: ExistingQuery = async (url, pubkey, slug) => {
  try {
    const relay = new Relay(url)
    const ev = await firstValueFrom(
      relay
        .request({ kinds: [30023], authors: [pubkey], '#d': [slug], limit: 1 })
        .pipe(timeout({ first: 5_000 })),
    )
    return !!ev
  } catch {
    return false
  }
}

export async function checkExisting(
  slug: string,
  pubkey: string,
  urls: string[],
  opts: { query?: ExistingQuery } = {},
): Promise<boolean> {
  const query = opts.query ?? defaultExistingQuery
  const results = await Promise.all(urls.map((u) => query(u, pubkey, slug)))
  return results.some((r) => r)
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/relays_test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/relays.ts publish/tests/relays_test.ts
git commit -m "publish(task 7): relay-pool-wrapper (publish + checkExisting)"
```

---

### Task 8: Outbox-Relay-Loader (kind:10002)

**Files:**
- Create: `publish/src/core/outbox.ts`
- Create: `publish/tests/outbox_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/outbox_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { parseOutbox } from '../src/core/outbox.ts'

Deno.test('parseOutbox: r-tags ohne marker → beide', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://damus'],
      ['r', 'wss://nos'],
    ],
  }
  assertEquals(parseOutbox(ev), {
    read: ['wss://damus', 'wss://nos'],
    write: ['wss://damus', 'wss://nos'],
  })
})

Deno.test('parseOutbox: marker read ignoriert schreib-nutzung', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://r-only', 'read'],
      ['r', 'wss://w-only', 'write'],
      ['r', 'wss://both'],
    ],
  }
  assertEquals(parseOutbox(ev), {
    read: ['wss://r-only', 'wss://both'],
    write: ['wss://w-only', 'wss://both'],
  })
})

Deno.test('parseOutbox: ignoriert andere tag-namen', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://x'],
      ['p', 'someone'],
    ],
  }
  assertEquals(parseOutbox(ev), { read: ['wss://x'], write: ['wss://x'] })
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/outbox_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/outbox.ts` schreiben**

```typescript
import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './relays.ts'

export interface Outbox {
  read: string[]
  write: string[]
}

export function parseOutbox(ev: { tags: string[][] }): Outbox {
  const read: string[] = []
  const write: string[] = []
  for (const t of ev.tags) {
    if (t[0] !== 'r' || !t[1]) continue
    const marker = t[2]
    if (marker === 'read') read.push(t[1])
    else if (marker === 'write') write.push(t[1])
    else {
      read.push(t[1])
      write.push(t[1])
    }
  }
  return { read, write }
}

export async function loadOutbox(
  bootstrapRelay: string,
  authorPubkeyHex: string,
): Promise<Outbox> {
  const relay = new Relay(bootstrapRelay)
  const ev = await firstValueFrom(
    relay
      .request({ kinds: [10002], authors: [authorPubkeyHex], limit: 1 })
      .pipe(timeout({ first: 10_000 })),
  ) as SignedEvent
  return parseOutbox(ev)
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/outbox_test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/outbox.ts publish/tests/outbox_test.ts
git commit -m "publish(task 8): outbox-relay-loader (kind:10002 parser + fetcher)"
```

---

### Task 9: Blossom-Server-Liste-Loader (kind:10063)

**Files:**
- Create: `publish/src/core/blossom-list.ts`
- Create: `publish/tests/blossom-list_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/blossom-list_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { parseBlossomServers } from '../src/core/blossom-list.ts'

Deno.test('parseBlossomServers: extrahiert server-urls in reihenfolge', () => {
  const ev = {
    kind: 10063,
    tags: [
      ['server', 'https://a.example'],
      ['server', 'https://b.example'],
      ['other', 'ignored'],
    ],
  }
  assertEquals(parseBlossomServers(ev), ['https://a.example', 'https://b.example'])
})

Deno.test('parseBlossomServers: leere liste bei fehlenden tags', () => {
  assertEquals(parseBlossomServers({ kind: 10063, tags: [] }), [])
})

Deno.test('parseBlossomServers: entfernt trailing-slash normalisierung', () => {
  const ev = {
    kind: 10063,
    tags: [
      ['server', 'https://a.example/'],
    ],
  }
  assertEquals(parseBlossomServers(ev), ['https://a.example'])
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/blossom-list_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/blossom-list.ts` schreiben**

```typescript
import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './relays.ts'

export function parseBlossomServers(ev: { tags: string[][] }): string[] {
  return ev.tags
    .filter((t) => t[0] === 'server' && t[1])
    .map((t) => t[1].replace(/\/$/, ''))
}

export async function loadBlossomServers(
  bootstrapRelay: string,
  authorPubkeyHex: string,
): Promise<string[]> {
  const relay = new Relay(bootstrapRelay)
  const ev = await firstValueFrom(
    relay
      .request({ kinds: [10063], authors: [authorPubkeyHex], limit: 1 })
      .pipe(timeout({ first: 10_000 })),
  ) as SignedEvent
  return parseBlossomServers(ev)
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/blossom-list_test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/blossom-list.ts publish/tests/blossom-list_test.ts
git commit -m "publish(task 9): blossom-server-liste-loader (kind:10063)"
```

---

### Task 10: NIP-46 Bunker-Signer-Wrapper

**Files:**
- Create: `publish/src/core/signer.ts`

- [ ] **Step 1: Implementierung schreiben**

`publish/src/core/signer.ts`:

```typescript
import { Nip46Signer } from 'applesauce-signers'
import type { UnsignedEvent } from './event.ts'
import type { SignedEvent } from './relays.ts'

export interface Signer {
  getPublicKey(): Promise<string>
  signEvent(ev: UnsignedEvent): Promise<SignedEvent>
}

export async function createBunkerSigner(bunkerUrl: string): Promise<Signer> {
  const signer = Nip46Signer.fromBunkerURI(bunkerUrl)
  const pubkey = await Promise.race([
    signer.getPublicKey(),
    new Promise<never>((_r, rej) => setTimeout(() => rej(new Error('Bunker ping timeout')), 30_000)),
  ])
  return {
    getPublicKey: () => Promise.resolve(pubkey),
    signEvent: async (ev: UnsignedEvent) => {
      const signed = await Promise.race([
        signer.signEvent(ev),
        new Promise<never>((_r, rej) =>
          setTimeout(() => rej(new Error('Bunker sign timeout')), 30_000)
        ),
      ])
      return signed as SignedEvent
    },
  }
}
```

Notiz: `Nip46Signer.fromBunkerURI` ist der Einstiegspunkt in applesauce-signers 2.x. Bei API-Differenzen (neue Version): `Nip46Signer`-Konstruktor-Signatur via Source-Lookup prüfen. Der Wrapper isoliert die Differenz.

- [ ] **Step 2: Kein Unit-Test — Integration wird später im `check`-Subcommand getestet.**

- [ ] **Step 3: Commit**

```bash
git add publish/src/core/signer.ts
git commit -m "publish(task 10): nip-46 bunker-signer-wrapper mit timeout"
```

---

## Phase 4 — Bild-Upload (Blossom)

### Task 11: Bild-Sammler (Post-Ordner → Bild-Dateien)

**Files:**
- Create: `publish/src/core/image-collector.ts`
- Create: `publish/tests/image-collector_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/image-collector_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { collectImages, mimeFromExt } from '../src/core/image-collector.ts'

Deno.test('mimeFromExt: erkennt gängige formate', () => {
  assertEquals(mimeFromExt('a.png'), 'image/png')
  assertEquals(mimeFromExt('a.jpg'), 'image/jpeg')
  assertEquals(mimeFromExt('a.jpeg'), 'image/jpeg')
  assertEquals(mimeFromExt('a.gif'), 'image/gif')
  assertEquals(mimeFromExt('a.webp'), 'image/webp')
  assertEquals(mimeFromExt('a.svg'), 'image/svg+xml')
})

Deno.test('collectImages: liest alle bild-dateien im ordner, ignoriert hugo-derivate', async () => {
  const tmp = await Deno.makeTempDir()
  try {
    await Deno.writeTextFile(`${tmp}/index.md`, '# hi')
    await Deno.writeFile(`${tmp}/a.png`, new Uint8Array([1]))
    await Deno.writeFile(`${tmp}/b.jpg`, new Uint8Array([2]))
    await Deno.writeFile(`${tmp}/a_hu_deadbeef.png`, new Uint8Array([3]))
    await Deno.writeTextFile(`${tmp}/notes.txt`, 'ignore me')
    const imgs = await collectImages(tmp)
    assertEquals(imgs.map((i) => i.fileName).sort(), ['a.png', 'b.jpg'])
    assertEquals(imgs.find((i) => i.fileName === 'a.png')?.mimeType, 'image/png')
  } finally {
    await Deno.remove(tmp, { recursive: true })
  }
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/image-collector_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/image-collector.ts` schreiben**

```typescript
import { extname, join } from '@std/path'

const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const HUGO_DERIVATIVE = /_hu_[0-9a-f]+\./

export function mimeFromExt(filename: string): string {
  return MIME_MAP[extname(filename).toLowerCase()] ?? 'application/octet-stream'
}

export interface ImageFile {
  fileName: string
  absolutePath: string
  data: Uint8Array
  mimeType: string
}

export async function collectImages(postDir: string): Promise<ImageFile[]> {
  const results: ImageFile[] = []
  for await (const entry of Deno.readDir(postDir)) {
    if (!entry.isFile) continue
    if (HUGO_DERIVATIVE.test(entry.name)) continue
    const ext = extname(entry.name).toLowerCase()
    if (!IMG_EXTS.has(ext)) continue
    const abs = join(postDir, entry.name)
    const data = await Deno.readFile(abs)
    results.push({
      fileName: entry.name,
      absolutePath: abs,
      data,
      mimeType: mimeFromExt(entry.name),
    })
  }
  results.sort((a, b) => a.fileName.localeCompare(b.fileName))
  return results
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/image-collector_test.ts`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/image-collector.ts publish/tests/image-collector_test.ts
git commit -m "publish(task 11): image-collector (ignoriert hugo-derivate)"
```

---

### Task 12: Blossom-Upload-Modul

**Files:**
- Create: `publish/src/core/blossom.ts`
- Create: `publish/tests/blossom_test.ts`

- [ ] **Step 1: Test schreiben (mit Injection für HTTP + Signer)**

`publish/tests/blossom_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { uploadBlob, type BlossomClient } from '../src/core/blossom.ts'

function fakeSigner() {
  return {
    getPublicKey: () => Promise.resolve('p'),
    signEvent: async (ev: unknown) => ({
      ...(ev as object),
      id: 'id',
      sig: 'sig',
      pubkey: 'p',
    }),
  }
}

Deno.test('uploadBlob: pusht zu allen servern, gibt erste url zurück', async () => {
  const data = new Uint8Array([1, 2, 3])
  const client: BlossomClient = {
    fetch: async (url, _init) => {
      return new Response(JSON.stringify({ url: url + '/hash.png', sha256: 'hash' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  }
  const result = await uploadBlob({
    data,
    fileName: 'x.png',
    mimeType: 'image/png',
    servers: ['https://a.example', 'https://b.example'],
    signer: fakeSigner(),
    client,
  })
  assertEquals(result.ok.length, 2)
  assertEquals(result.primaryUrl, 'https://a.example/upload/hash.png')
})

Deno.test('uploadBlob: akzeptiert wenn mindestens ein server ok', async () => {
  const data = new Uint8Array([1])
  const client: BlossomClient = {
    fetch: async (url) => {
      if (url.startsWith('https://fail.example')) {
        return new Response('nope', { status: 500 })
      }
      return new Response(JSON.stringify({ url: url + '/h.png', sha256: 'h' }), { status: 200 })
    },
  }
  const result = await uploadBlob({
    data,
    fileName: 'x.png',
    mimeType: 'image/png',
    servers: ['https://fail.example', 'https://ok.example'],
    signer: fakeSigner(),
    client,
  })
  assertEquals(result.ok, ['https://ok.example'])
  assertEquals(result.failed, ['https://fail.example'])
})

Deno.test('uploadBlob: wirft wenn alle server ablehnen', async () => {
  const data = new Uint8Array([1])
  const client: BlossomClient = {
    fetch: async () => new Response('err', { status: 500 }),
  }
  let threw = false
  try {
    await uploadBlob({
      data,
      fileName: 'x.png',
      mimeType: 'image/png',
      servers: ['https://a.example'],
      signer: fakeSigner(),
      client,
    })
  } catch (err) {
    threw = true
    assertEquals(String(err).includes('all blossom servers failed'), true)
  }
  assertEquals(threw, true)
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/blossom_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/blossom.ts` schreiben**

```typescript
import { encodeBase64 } from '@std/encoding/base64'
import type { Signer } from './signer.ts'

export interface BlossomClient {
  fetch(url: string, init: RequestInit): Promise<Response>
}

export interface UploadArgs {
  data: Uint8Array
  fileName: string
  mimeType: string
  servers: string[]
  signer: Signer
  client?: BlossomClient
}

export interface UploadReport {
  ok: string[]
  failed: string[]
  primaryUrl: string
  sha256: string
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function buildAuth(signer: Signer, hash: string): Promise<string> {
  const pubkey = await signer.getPublicKey()
  const auth = {
    kind: 24242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['t', 'upload'],
      ['x', hash],
      ['expiration', String(Math.floor(Date.now() / 1000) + 300)],
    ],
    content: '',
  }
  const signed = await signer.signEvent(auth)
  return 'Nostr ' + encodeBase64(new TextEncoder().encode(JSON.stringify(signed)))
}

async function uploadOne(
  server: string,
  data: Uint8Array,
  mimeType: string,
  auth: string,
  client: BlossomClient,
): Promise<{ ok: boolean; url?: string }> {
  try {
    const resp = await client.fetch(server + '/upload', {
      method: 'PUT',
      headers: { authorization: auth, 'content-type': mimeType },
      body: data,
    })
    if (!resp.ok) return { ok: false }
    const json = await resp.json()
    return { ok: true, url: json.url }
  } catch {
    return { ok: false }
  }
}

const defaultClient: BlossomClient = { fetch: (u, i) => fetch(u, i) }

export async function uploadBlob(args: UploadArgs): Promise<UploadReport> {
  const client = args.client ?? defaultClient
  const hash = await sha256Hex(args.data)
  const auth = await buildAuth(args.signer, hash)
  const results = await Promise.all(
    args.servers.map((s) =>
      uploadOne(s, args.data, args.mimeType, auth, client).then((r) => ({ server: s, ...r }))
    ),
  )
  const ok = results.filter((r) => r.ok).map((r) => r.server)
  const failed = results.filter((r) => !r.ok).map((r) => r.server)
  if (ok.length === 0) {
    throw new Error(`all blossom servers failed for ${args.fileName}`)
  }
  const first = results.find((r) => r.ok && r.url)!
  return { ok, failed, primaryUrl: first.url!, sha256: hash }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/blossom_test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/blossom.ts publish/tests/blossom_test.ts
git commit -m "publish(task 12): blossom-upload mit multi-server, bud-01 auth"
```

---

## Phase 5 — Change-Detection und Logging

### Task 13: Git-Diff-basierte Change-Detection

**Files:**
- Create: `publish/src/core/change-detection.ts`
- Create: `publish/tests/change-detection_test.ts`

- [ ] **Step 1: Test schreiben (mit injiziertem Git-Runner)**

`publish/tests/change-detection_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { changedPostDirs, filterPostDirs, type GitRunner } from '../src/core/change-detection.ts'

Deno.test('filterPostDirs: extrahiert post-ordner aus dateipfaden (content/posts)', () => {
  const lines = [
    'content/posts/a/index.md',
    'content/posts/b/image.png',
    'content/posts/c/other.md',
    'README.md',
    'app/src/lib/x.ts',
  ]
  assertEquals(
    filterPostDirs(lines, 'content/posts').sort(),
    ['content/posts/a', 'content/posts/b'],
  )
})

Deno.test('filterPostDirs: respektiert alternativen root (blog/)', () => {
  const lines = [
    'blog/x/index.md',
    'blog/y/pic.png',
    'content/posts/z/index.md',
    'README.md',
  ]
  assertEquals(filterPostDirs(lines, 'blog').sort(), ['blog/x', 'blog/y'])
})

Deno.test('filterPostDirs: ignoriert _drafts und non-index.md', () => {
  const lines = [
    'content/posts/a/index.md',
    'content/posts/a/extra.md',
    'content/posts/_drafts/x/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/a'])
})

Deno.test('changedPostDirs: nutzt git diff --name-only A..B', async () => {
  const runner: GitRunner = async (args) => {
    assertEquals(args[0], 'diff')
    assertEquals(args[1], '--name-only')
    assertEquals(args[2], 'HEAD~1..HEAD')
    return 'content/posts/x/index.md\nREADME.md\n'
  }
  const dirs = await changedPostDirs({
    from: 'HEAD~1',
    to: 'HEAD',
    contentRoot: 'content/posts',
    runner,
  })
  assertEquals(dirs, ['content/posts/x'])
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/change-detection_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/change-detection.ts` schreiben**

```typescript
export type GitRunner = (args: string[]) => Promise<string>

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function filterPostDirs(lines: string[], contentRoot: string): string[] {
  const root = contentRoot.replace(/\/$/, '')
  const prefix = root + '/'
  const indexRe = new RegExp(`^${escapeRegex(prefix)}([^/]+)/index\\.md$`)
  const assetRe = new RegExp(`^${escapeRegex(prefix)}([^/]+)/`)
  const drafts = prefix + '_'
  const dirs = new Set<string>()
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    if (l.startsWith(drafts)) continue
    const indexMatch = l.match(indexRe)
    if (indexMatch) {
      dirs.add(`${prefix}${indexMatch[1]}`)
      continue
    }
    const assetMatch = l.match(assetRe)
    if (assetMatch && !l.endsWith('.md')) {
      dirs.add(`${prefix}${assetMatch[1]}`)
    }
  }
  return [...dirs].sort()
}

const defaultRunner: GitRunner = async (args) => {
  const proc = new Deno.Command('git', { args, stdout: 'piped', stderr: 'piped' })
  const out = await proc.output()
  if (out.code !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${new TextDecoder().decode(out.stderr)}`)
  }
  return new TextDecoder().decode(out.stdout)
}

export interface DiffArgs {
  from: string
  to: string
  contentRoot: string
  runner?: GitRunner
}

export async function changedPostDirs(args: DiffArgs): Promise<string[]> {
  const runner = args.runner ?? defaultRunner
  const stdout = await runner(['diff', '--name-only', `${args.from}..${args.to}`])
  return filterPostDirs(stdout.split('\n'), args.contentRoot)
}

export async function allPostDirs(contentRoot: string): Promise<string[]> {
  const result: string[] = []
  for await (const entry of Deno.readDir(contentRoot)) {
    if (entry.isDirectory && !entry.name.startsWith('_')) {
      const indexPath = `${contentRoot}/${entry.name}/index.md`
      try {
        const stat = await Deno.stat(indexPath)
        if (stat.isFile) result.push(`${contentRoot}/${entry.name}`)
      } catch {
        // skip folders without index.md
      }
    }
  }
  return result.sort()
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/change-detection_test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/change-detection.ts publish/tests/change-detection_test.ts
git commit -m "publish(task 13): git-diff change-detection für post-ordner"
```

---

### Task 14: Structured-Logger

**Files:**
- Create: `publish/src/core/log.ts`
- Create: `publish/tests/log_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/log_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { createLogger } from '../src/core/log.ts'

Deno.test('logger: sammelt post-einträge und schreibt summary', () => {
  const sink: string[] = []
  const logger = createLogger({
    mode: 'force-all',
    runId: 'run-1',
    print: (line) => sink.push(line),
    now: () => new Date('2026-04-16T10:00:00Z'),
  })
  logger.postSuccess({
    slug: 's1',
    action: 'new',
    eventId: 'ev1',
    relaysOk: ['wss://r1'],
    relaysFailed: [],
    blossomServersOk: [],
    imagesUploaded: 0,
    durationMs: 10,
  })
  logger.postSkippedDraft('s2')
  const summary = logger.finalize(0)
  assertEquals(summary.run_id, 'run-1')
  assertEquals(summary.mode, 'force-all')
  assertEquals(summary.posts.length, 2)
  assertEquals(summary.posts[0].status, 'success')
  assertEquals(summary.posts[1].status, 'skipped-draft')
  assertEquals(summary.exit_code, 0)
  assertEquals(sink.some((s) => s.includes('s1')), true)
})

Deno.test('logger: writeJson schreibt datei', async () => {
  const tmp = await Deno.makeTempDir()
  try {
    const logger = createLogger({
      mode: 'diff',
      runId: 'run-2',
      print: () => {},
      now: () => new Date('2026-04-16T10:00:00Z'),
    })
    const summary = logger.finalize(0)
    await logger.writeJson(`${tmp}/out.json`, summary)
    const text = await Deno.readTextFile(`${tmp}/out.json`)
    const parsed = JSON.parse(text)
    assertEquals(parsed.run_id, 'run-2')
  } finally {
    await Deno.remove(tmp, { recursive: true })
  }
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/log_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/core/log.ts` schreiben**

```typescript
export type RunMode = 'diff' | 'force-all' | 'post-single'

export interface PostLog {
  slug: string
  status: 'success' | 'failed' | 'skipped-draft'
  action?: 'new' | 'update'
  event_id?: string
  relays_ok?: string[]
  relays_failed?: string[]
  blossom_servers_ok?: string[]
  images_uploaded?: number
  duration_ms?: number
  error?: string
}

export interface RunLog {
  run_id: string
  started_at: string
  ended_at: string
  mode: RunMode
  posts: PostLog[]
  exit_code: number
}

export interface SuccessArgs {
  slug: string
  action: 'new' | 'update'
  eventId: string
  relaysOk: string[]
  relaysFailed: string[]
  blossomServersOk: string[]
  imagesUploaded: number
  durationMs: number
}

export interface FailedArgs {
  slug: string
  error: string
  durationMs: number
}

export interface LoggerOptions {
  mode: RunMode
  runId: string
  print?: (line: string) => void
  now?: () => Date
}

export interface Logger {
  postSuccess(args: SuccessArgs): void
  postFailed(args: FailedArgs): void
  postSkippedDraft(slug: string): void
  finalize(exitCode: number): RunLog
  writeJson(path: string, summary: RunLog): Promise<void>
}

export function createLogger(opts: LoggerOptions): Logger {
  const print = opts.print ?? ((line: string) => console.log(line))
  const now = opts.now ?? (() => new Date())
  const posts: PostLog[] = []
  const startedAt = now().toISOString()
  return {
    postSuccess(a) {
      posts.push({
        slug: a.slug,
        status: 'success',
        action: a.action,
        event_id: a.eventId,
        relays_ok: a.relaysOk,
        relays_failed: a.relaysFailed,
        blossom_servers_ok: a.blossomServersOk,
        images_uploaded: a.imagesUploaded,
        duration_ms: a.durationMs,
      })
      print(
        `✓ ${a.slug} (${a.action}) — relays:${a.relaysOk.length}ok/${a.relaysFailed.length}fail — ${a.durationMs}ms`,
      )
    },
    postFailed(a) {
      posts.push({
        slug: a.slug,
        status: 'failed',
        error: a.error,
        duration_ms: a.durationMs,
      })
      print(`✗ ${a.slug} — ${a.error}`)
    },
    postSkippedDraft(slug) {
      posts.push({ slug, status: 'skipped-draft' })
      print(`- ${slug} (draft, skipped)`)
    },
    finalize(exitCode) {
      return {
        run_id: opts.runId,
        started_at: startedAt,
        ended_at: now().toISOString(),
        mode: opts.mode,
        posts,
        exit_code: exitCode,
      }
    },
    async writeJson(path, summary) {
      await Deno.writeTextFile(path, JSON.stringify(summary, null, 2))
    },
  }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/log_test.ts`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/log.ts publish/tests/log_test.ts
git commit -m "publish(task 14): structured json logger"
```

---

## Phase 6 — Subcommands und CLI

### Task 15: `processPost`-Pipeline (Kern-Logik)

**Files:**
- Create: `publish/src/subcommands/publish.ts`
- Create: `publish/tests/publish_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/publish_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { processPost, type PostDeps } from '../src/subcommands/publish.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

function makeDeps(overrides: Partial<PostDeps> = {}): PostDeps {
  return {
    readPostFile: async () => ({
      fm: {
        title: 'T',
        slug: 's',
        date: new Date('2024-01-01'),
      } as Frontmatter,
      body: 'body',
    }),
    collectImages: async () => [],
    uploadBlossom: async (args) => ({
      ok: ['https://b1'],
      failed: [],
      primaryUrl: `https://b1/${args.fileName}-hash`,
      sha256: 'hash',
    }),
    sign: async (ev) => ({ ...ev, id: 'ev-id', sig: 'sig' }),
    publish: async () => ({ ok: ['wss://r1', 'wss://r2'], failed: [] }),
    checkExisting: async () => false,
    ...overrides,
  }
}

function baseArgs(deps = makeDeps()) {
  return {
    postDir: '/p/s',
    writeRelays: ['wss://r1', 'wss://r2'],
    blossomServers: ['https://b1'],
    pubkeyHex: 'a'.repeat(64),
    clientTag: 'test-client',
    minRelayAcks: 2,
    deps,
  }
}

Deno.test('processPost: happy-path neu, ohne bilder', async () => {
  const result = await processPost(baseArgs())
  assertEquals(result.status, 'success')
  assertEquals(result.action, 'new')
  assertEquals(result.eventId, 'ev-id')
  assertEquals(result.relaysOk.length, 2)
})

Deno.test('processPost: draft wird geskippt', async () => {
  const deps = makeDeps({
    readPostFile: async () => ({
      fm: {
        title: 'T',
        slug: 's',
        date: new Date('2024-01-01'),
        draft: true,
      } as Frontmatter,
      body: 'b',
    }),
  })
  const result = await processPost({ ...baseArgs(deps), writeRelays: ['wss://r1'] })
  assertEquals(result.status, 'skipped-draft')
})

Deno.test('processPost: zu wenig relay-acks → failed', async () => {
  const deps = makeDeps({
    publish: async () => ({ ok: ['wss://r1'], failed: ['wss://r2', 'wss://r3', 'wss://r4'] }),
  })
  const result = await processPost({
    ...baseArgs(deps),
    writeRelays: ['wss://r1', 'wss://r2', 'wss://r3', 'wss://r4'],
  })
  assertEquals(result.status, 'failed')
  assertEquals(String(result.error).includes('relays'), true)
})

Deno.test('processPost: konfigurierbarer minRelayAcks', async () => {
  // 1 Relay-Ack akzeptiert, wenn minRelayAcks=1
  const deps = makeDeps({
    publish: async () => ({ ok: ['wss://r1'], failed: ['wss://r2'] }),
  })
  const result = await processPost({
    ...baseArgs(deps),
    writeRelays: ['wss://r1', 'wss://r2'],
    minRelayAcks: 1,
  })
  assertEquals(result.status, 'success')
})

Deno.test('processPost: bestehender d-tag → action = update', async () => {
  const result = await processPost(baseArgs(makeDeps({ checkExisting: async () => true })))
  assertEquals(result.status, 'success')
  assertEquals(result.action, 'update')
})

Deno.test('processPost: bilder landen auf blossom, body wird rewritten', async () => {
  const uploaded: string[] = []
  const deps = makeDeps({
    readPostFile: async () => ({
      fm: {
        title: 'T',
        slug: 's',
        date: new Date('2024-01-01'),
        cover: { image: 'cover.png' },
      } as Frontmatter,
      body: 'Pic: ![x](a.png) cover ![c](cover.png)',
    }),
    collectImages: async () => [
      {
        fileName: 'a.png',
        absolutePath: '/p/s/a.png',
        data: new Uint8Array([1]),
        mimeType: 'image/png',
      },
      {
        fileName: 'cover.png',
        absolutePath: '/p/s/cover.png',
        data: new Uint8Array([2]),
        mimeType: 'image/png',
      },
    ],
    uploadBlossom: async (args) => {
      uploaded.push(args.fileName)
      return {
        ok: ['https://b1'],
        failed: [],
        primaryUrl: `https://b1/${args.fileName}-hash`,
        sha256: 'h',
      }
    },
  })
  const result = await processPost(baseArgs(deps))
  assertEquals(result.status, 'success')
  assertEquals(uploaded.sort(), ['a.png', 'cover.png'])
  assertEquals(result.imagesUploaded, 2)
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/publish_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/subcommands/publish.ts` schreiben**

```typescript
import { join } from '@std/path'
import { parseFrontmatter, type Frontmatter } from '../core/frontmatter.ts'
import { validatePost } from '../core/validation.ts'
import { buildKind30023, type UnsignedEvent } from '../core/event.ts'
import { resolveCoverUrl, rewriteImageUrls } from '../core/markdown.ts'
import type { ImageFile } from '../core/image-collector.ts'
import type { RelaysReport, SignedEvent } from '../core/relays.ts'
import type { UploadReport } from '../core/blossom.ts'

export interface PostDeps {
  readPostFile(path: string): Promise<{ fm: Frontmatter; body: string }>
  collectImages(postDir: string): Promise<ImageFile[]>
  uploadBlossom(args: {
    data: Uint8Array
    fileName: string
    mimeType: string
  }): Promise<UploadReport>
  sign(ev: UnsignedEvent): Promise<SignedEvent>
  publish(ev: SignedEvent, relays: string[]): Promise<RelaysReport>
  checkExisting(slug: string, relays: string[]): Promise<boolean>
}

export interface ProcessArgs {
  postDir: string
  writeRelays: string[]
  blossomServers: string[]
  pubkeyHex: string
  clientTag: string
  minRelayAcks: number
  deps: PostDeps
  now?: () => number
}

export interface ProcessResult {
  status: 'success' | 'failed' | 'skipped-draft'
  action?: 'new' | 'update'
  slug: string
  eventId?: string
  relaysOk: string[]
  relaysFailed: string[]
  blossomServersOk: string[]
  imagesUploaded: number
  durationMs: number
  error?: string
}

export async function processPost(args: ProcessArgs): Promise<ProcessResult> {
  const started = performance.now()
  const now = args.now ?? (() => Math.floor(Date.now() / 1000))
  let slug = '?'
  try {
    const { fm, body } = await args.deps.readPostFile(join(args.postDir, 'index.md'))
    validatePost(fm)
    slug = fm.slug

    if (fm.draft === true) {
      return {
        status: 'skipped-draft',
        slug,
        relaysOk: [],
        relaysFailed: [],
        blossomServersOk: [],
        imagesUploaded: 0,
        durationMs: Math.round(performance.now() - started),
      }
    }

    const images = await args.deps.collectImages(args.postDir)
    const blossomOkServers = new Set<string>()
    const mapping = new Map<string, string>()
    for (const img of images) {
      const rep = await args.deps.uploadBlossom({
        data: img.data,
        fileName: img.fileName,
        mimeType: img.mimeType,
      })
      for (const s of rep.ok) blossomOkServers.add(s)
      mapping.set(img.fileName, rep.primaryUrl)
    }

    const rewrittenBody = rewriteImageUrls(body, mapping)
    const coverRaw = fm.cover?.image ?? fm.image
    const coverUrl = resolveCoverUrl(coverRaw, mapping)

    const unsigned = buildKind30023({
      fm,
      rewrittenBody,
      coverUrl,
      pubkeyHex: args.pubkeyHex,
      clientTag: args.clientTag,
      nowSeconds: now(),
    })

    const existing = await args.deps.checkExisting(fm.slug, args.writeRelays)
    const signed = await args.deps.sign(unsigned)
    const pubRep = await args.deps.publish(signed, args.writeRelays)
    if (pubRep.ok.length < args.minRelayAcks) {
      throw new Error(
        `insufficient relays acked (${pubRep.ok.length} < ${args.minRelayAcks})`,
      )
    }

    return {
      status: 'success',
      action: existing ? 'update' : 'new',
      slug,
      eventId: signed.id,
      relaysOk: pubRep.ok,
      relaysFailed: pubRep.failed,
      blossomServersOk: [...blossomOkServers],
      imagesUploaded: images.length,
      durationMs: Math.round(performance.now() - started),
    }
  } catch (err) {
    return {
      status: 'failed',
      slug,
      relaysOk: [],
      relaysFailed: [],
      blossomServersOk: [],
      imagesUploaded: 0,
      durationMs: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/publish_test.ts`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/subcommands/publish.ts publish/tests/publish_test.ts
git commit -m "publish(task 15): processPost — kern-pipeline pro post (tdd)"
```

---

### Task 16: `check`-Subcommand (Pre-Flight)

**Files:**
- Create: `publish/src/subcommands/check.ts`

- [ ] **Step 1: Modul schreiben**

`publish/src/subcommands/check.ts`:

```typescript
import type { Config } from '../core/config.ts'
import { createBunkerSigner } from '../core/signer.ts'
import { loadOutbox } from '../core/outbox.ts'
import { loadBlossomServers } from '../core/blossom-list.ts'

export interface CheckResult {
  ok: boolean
  issues: string[]
}

export async function runCheck(config: Config): Promise<CheckResult> {
  const issues: string[] = []

  try {
    const signer = await createBunkerSigner(config.bunkerUrl)
    const pk = await signer.getPublicKey()
    if (pk !== config.authorPubkeyHex) {
      issues.push(
        `bunker-pubkey (${pk}) matcht AUTHOR_PUBKEY_HEX (${config.authorPubkeyHex}) nicht`,
      )
    }
  } catch (err) {
    issues.push(`bunker-ping fehlgeschlagen: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const outbox = await loadOutbox(config.bootstrapRelay, config.authorPubkeyHex)
    if (outbox.write.length === 0) {
      issues.push('kind:10002 hat keine write-relays — publiziere zuerst ein gültiges Event')
    }
  } catch (err) {
    issues.push(`kind:10002 laden: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const servers = await loadBlossomServers(config.bootstrapRelay, config.authorPubkeyHex)
    if (servers.length === 0) {
      issues.push('kind:10063 hat keine server — publiziere zuerst ein gültiges Event')
    } else {
      // Health-Check pro Server
      for (const server of servers) {
        try {
          const resp = await fetch(server + '/', { method: 'HEAD' })
          if (!resp.ok && resp.status !== 405) {
            issues.push(`blossom-server ${server}: HTTP ${resp.status}`)
          }
        } catch (err) {
          issues.push(`blossom-server ${server}: ${err instanceof Error ? err.message : err}`)
        }
      }
    }
  } catch (err) {
    issues.push(`kind:10063 laden: ${err instanceof Error ? err.message : err}`)
  }

  return { ok: issues.length === 0, issues }
}

export function printCheckResult(result: CheckResult): void {
  if (result.ok) {
    console.log('✓ pre-flight ok')
    return
  }
  console.error('✗ pre-flight issues:')
  for (const i of result.issues) console.error(`  - ${i}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add publish/src/subcommands/check.ts
git commit -m "publish(task 16): check-subcommand (pre-flight-validation)"
```

---

### Task 17: `validate-post`-Subcommand (Offline)

**Files:**
- Create: `publish/src/subcommands/validate-post.ts`
- Create: `publish/tests/validate-post_test.ts`

- [ ] **Step 1: Test schreiben**

`publish/tests/validate-post_test.ts`:

```typescript
import { assertEquals } from '@std/assert'
import { validatePostFile } from '../src/subcommands/validate-post.ts'

Deno.test('validatePostFile: ok bei fixture-post', async () => {
  const result = await validatePostFile('./tests/fixtures/sample-post.md')
  assertEquals(result.ok, true)
  assertEquals(result.slug, 'sample-slug')
})

Deno.test('validatePostFile: fehler bei fehlender datei', async () => {
  const result = await validatePostFile('./does-not-exist.md')
  assertEquals(result.ok, false)
  assertEquals(result.error?.includes('read'), true)
})

Deno.test('validatePostFile: fehler bei ungültigem slug', async () => {
  const tmp = await Deno.makeTempFile({ suffix: '.md' })
  try {
    await Deno.writeTextFile(
      tmp,
      '---\ntitle: "T"\nslug: "Bad Slug"\ndate: 2024-01-01\n---\n\nbody',
    )
    const result = await validatePostFile(tmp)
    assertEquals(result.ok, false)
    assertEquals(result.error?.includes('slug'), true)
  } finally {
    await Deno.remove(tmp)
  }
})
```

- [ ] **Step 2: Verifiziere FAIL**

Run: `cd publish && deno test tests/validate-post_test.ts`
Expected: FAIL

- [ ] **Step 3: `publish/src/subcommands/validate-post.ts` schreiben**

```typescript
import { parseFrontmatter } from '../core/frontmatter.ts'
import { validatePost } from '../core/validation.ts'

export interface ValidateResult {
  ok: boolean
  slug?: string
  error?: string
}

export async function validatePostFile(path: string): Promise<ValidateResult> {
  let text: string
  try {
    text = await Deno.readTextFile(path)
  } catch (err) {
    return { ok: false, error: `cannot read ${path}: ${err instanceof Error ? err.message : err}` }
  }
  try {
    const { fm } = parseFrontmatter(text)
    validatePost(fm)
    return { ok: true, slug: fm.slug }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

- [ ] **Step 4: Tests PASS**

Run: `cd publish && deno test tests/validate-post_test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add publish/src/subcommands/validate-post.ts publish/tests/validate-post_test.ts
git commit -m "publish(task 17): validate-post-subcommand"
```

---

### Task 18: CLI-Entrypoint mit Subcommand-Dispatcher

**Files:**
- Create: `publish/src/cli.ts`

- [ ] **Step 1: Modul schreiben**

`publish/src/cli.ts`:

```typescript
import { parseArgs } from '@std/cli/parse-args'
import { join } from '@std/path'
import { loadConfig } from './core/config.ts'
import { createBunkerSigner } from './core/signer.ts'
import { loadOutbox } from './core/outbox.ts'
import { loadBlossomServers } from './core/blossom-list.ts'
import { parseFrontmatter } from './core/frontmatter.ts'
import { checkExisting, publishToRelays } from './core/relays.ts'
import { uploadBlob } from './core/blossom.ts'
import { collectImages } from './core/image-collector.ts'
import { allPostDirs, changedPostDirs } from './core/change-detection.ts'
import { createLogger, type RunMode } from './core/log.ts'
import { processPost, type PostDeps } from './subcommands/publish.ts'
import { printCheckResult, runCheck } from './subcommands/check.ts'
import { validatePostFile } from './subcommands/validate-post.ts'

function uuid(): string {
  return crypto.randomUUID()
}

async function cmdCheck(): Promise<number> {
  const config = loadConfig()
  const result = await runCheck(config)
  printCheckResult(result)
  return result.ok ? 0 : 1
}

async function cmdValidatePost(path: string | undefined): Promise<number> {
  if (!path) {
    console.error('usage: validate-post <path-to-index.md>')
    return 2
  }
  const result = await validatePostFile(path)
  if (result.ok) {
    console.log(`✓ ${path} ok (slug: ${result.slug})`)
    return 0
  }
  console.error(`✗ ${path}: ${result.error}`)
  return 1
}

async function findBySlug(dirs: string[], slug: string): Promise<string | undefined> {
  for (const d of dirs) {
    try {
      const text = await Deno.readTextFile(join(d, 'index.md'))
      const { fm } = parseFrontmatter(text)
      if (fm.slug === slug) return d
    } catch {
      // skip
    }
  }
  return undefined
}

async function resolvePostDirs(
  mode: RunMode,
  contentRoot: string,
  single?: string,
): Promise<string[]> {
  if (mode === 'post-single' && single) {
    if (single.startsWith(contentRoot + '/')) return [single]
    const all = await allPostDirs(contentRoot)
    const match = all.find((d) => d.endsWith(`/${single}`)) ?? (await findBySlug(all, single))
    if (!match) throw new Error(`post mit slug "${single}" nicht gefunden`)
    return [match]
  }
  if (mode === 'force-all') return await allPostDirs(contentRoot)
  const before = Deno.env.get('GITHUB_EVENT_BEFORE') ?? 'HEAD~1'
  return await changedPostDirs({ from: before, to: 'HEAD', contentRoot })
}

async function cmdPublish(flags: {
  forceAll: boolean
  post?: string
  dryRun: boolean
}): Promise<number> {
  const config = loadConfig()
  const mode: RunMode = flags.post ? 'post-single' : flags.forceAll ? 'force-all' : 'diff'
  const runId = uuid()
  const logger = createLogger({ mode, runId })

  const signer = await createBunkerSigner(config.bunkerUrl)
  const outbox = await loadOutbox(config.bootstrapRelay, config.authorPubkeyHex)
  const blossomServers = await loadBlossomServers(config.bootstrapRelay, config.authorPubkeyHex)
  if (outbox.write.length === 0) {
    console.error('no write relays in kind:10002')
    return 1
  }
  if (blossomServers.length === 0) {
    console.error('no blossom servers in kind:10063')
    return 1
  }

  const postDirs = await resolvePostDirs(mode, config.contentRoot, flags.post)
  console.log(`mode=${mode} posts=${postDirs.length} runId=${runId} contentRoot=${config.contentRoot}`)

  if (flags.dryRun) {
    for (const d of postDirs) console.log(`  dry-run: ${d}`)
    return 0
  }

  const deps: PostDeps = {
    readPostFile: async (p) => parseFrontmatter(await Deno.readTextFile(p)),
    collectImages: (dir) => collectImages(dir),
    uploadBlossom: (a) =>
      uploadBlob({
        data: a.data,
        fileName: a.fileName,
        mimeType: a.mimeType,
        servers: blossomServers,
        signer,
      }),
    sign: (ev) => signer.signEvent(ev),
    publish: (ev, relays) => publishToRelays(relays, ev),
    checkExisting: (slug, relays) => checkExisting(slug, config.authorPubkeyHex, relays),
  }

  let anyFailed = false
  for (const dir of postDirs) {
    const result = await processPost({
      postDir: dir,
      writeRelays: outbox.write,
      blossomServers,
      pubkeyHex: config.authorPubkeyHex,
      clientTag: config.clientTag,
      minRelayAcks: config.minRelayAcks,
      deps,
    })
    if (result.status === 'success') {
      logger.postSuccess({
        slug: result.slug,
        action: result.action!,
        eventId: result.eventId!,
        relaysOk: result.relaysOk,
        relaysFailed: result.relaysFailed,
        blossomServersOk: result.blossomServersOk,
        imagesUploaded: result.imagesUploaded,
        durationMs: result.durationMs,
      })
    } else if (result.status === 'skipped-draft') {
      logger.postSkippedDraft(result.slug)
    } else {
      anyFailed = true
      logger.postFailed({
        slug: result.slug,
        error: result.error ?? 'unknown',
        durationMs: result.durationMs,
      })
    }
  }

  const exitCode = anyFailed ? 1 : 0
  const summary = logger.finalize(exitCode)
  await Deno.mkdir('./logs', { recursive: true })
  const logPath = `./logs/publish-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  await logger.writeJson(logPath, summary)
  console.log(`log: ${logPath}`)
  return exitCode
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    boolean: ['force-all', 'dry-run'],
    string: ['post'],
  })
  const sub = args._[0]
  if (sub === 'check') return cmdCheck()
  if (sub === 'validate-post') return cmdValidatePost(args._[1] as string | undefined)
  if (sub === 'publish') {
    return cmdPublish({
      forceAll: args['force-all'] === true,
      post: args.post,
      dryRun: args['dry-run'] === true,
    })
  }
  console.error('usage: cli.ts <publish | check | validate-post> [flags]')
  return 2
}

if (import.meta.main) {
  Deno.exit(await main())
}
```

- [ ] **Step 2: Smoke-Test**

Run: `cd publish && deno run src/cli.ts`
Expected: Usage-Message, Exit-Code 2.

Run: `cd publish && deno run --allow-read src/cli.ts validate-post tests/fixtures/sample-post.md`
Expected: `✓ tests/fixtures/sample-post.md ok (slug: sample-slug)`

- [ ] **Step 3: Commit**

```bash
git add publish/src/cli.ts
git commit -m "publish(task 18): cli-entrypoint mit subcommand-dispatch"
```

---

## Phase 7 — Pre-Flight gegen reale Infrastruktur

### Task 19: `deno task check` gegen Amber + Relays + Blossom

**Files:** keine Änderungen — nur Verifikation.

- [ ] **Step 1: `deno task check` laufen lassen**

Run: `cd publish && deno task check`

Erwartung: `✓ pre-flight ok`. Bei Fehlern:
- **Bunker-Ping-Timeout:** Amber öffnen, Akku-Optimierung deaktivieren, Permission für Pipeline-App auf auto-approve für `kind:30023` und `kind:24242` setzen.
- **kind:10002 fehlt / leer:** siehe Spec §2.3 — Event manuell publizieren.
- **kind:10063 fehlt / leer:** siehe Spec §2.4 — Event manuell publizieren.
- **Blossom-Server 4xx/5xx:** anderen Server in `kind:10063` eintragen.

- [ ] **Step 2: Kein Commit. Nur Verifikation.**

---

## Phase 8 — Integrationstest: Einzel-Post

### Task 20: Dry-run + echte Publikation eines einzelnen Posts

**Files:** keine Änderungen.

- [ ] **Step 1: Dry-run**

Run:
```bash
cd publish && deno task publish --post offenheit-das-wesentliche --dry-run
```

Expected: `mode=post-single posts=1 runId=<uuid>` + `dry-run: content/posts/2024-01-16-offenheit-das-wesentliche`.

- [ ] **Step 2: Echte Einzel-Publikation**

```bash
cd publish && deno task publish --post offenheit-das-wesentliche
```

Beobachten:
- Amber zeigt N Signatur-Requests: 1 × `kind:30023` (Event) + M × `kind:24242` (Blossom-Auth, pro Bild).
- Auto-approve sollte alle ohne manuellen Tap durchwinken.
- Log: `images_uploaded: M`, `relays_ok.length ≥ 2`.

Expected-Exit-Code: 0, Log in `publish/logs/publish-*.json`.

- [ ] **Step 3: Event auf Relay verifizieren**

```bash
nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 --tag d=offenheit-das-wesentliche wss://relay.damus.io 2>/dev/null | jq -c '{id, kind, tags: (.tags[:5])}'
```

Expected: genau 1 Event mit `d`, `title`, `published_at`, `summary`, `image`-Tags.

- [ ] **Step 4: Bild auf Blossom verifizieren**

URL aus dem Event-Content (`content`) herausziehen, per `curl -sI` prüfen. Erwartung: HTTP 200.

- [ ] **Step 5: Live-Check auf der SPA**

Öffne `https://svelte.joerg-lohrer.de/`, der Post sollte in der Liste erscheinen. Bilder laden von Blossom, Layout okay?

**Wenn Probleme auftreten, HIER STOPPEN** und mit dem User debuggen, bevor `--force-all` läuft.

---

## Phase 9 — Massen-Migration

### Task 21: Alle 18 Posts publizieren

**Files:** keine Code-Änderung.

- [ ] **Step 1: Event-Stand vor der Migration sichern**

```bash
nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -s 'length'
```

Zahl notieren (sollte ~10 sein, siehe STATUS.md).

- [ ] **Step 2: Dry-run auf alle**

```bash
cd publish && deno task publish --force-all --dry-run
```

Expected: `mode=force-all posts=18`.

- [ ] **Step 3: Echte Migration**

```bash
cd publish && deno task publish --force-all
```

Beobachten:
- Amber online, Akku-Optimierung aus, Auto-Approve aktiv.
- Pipeline läuft sequenziell.
- 18 `kind:30023`-Signaturen + N × `kind:24242` (pro Bild eines).
- Erwartet: ~3–5 min Gesamtlaufzeit bei ~90 Bildern.

Expected: Exit-Code 0, Log mit 18 Einträgen, alle `status: success`.

- [ ] **Step 4: Verifikation auf Relay**

```bash
nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -s 'length'
```

Expected: `18`.

- [ ] **Step 5: SPA-Stichprobe**

Mindestens 5 Posts auf `https://svelte.joerg-lohrer.de/` durchklicken. Bilder laden? Kommentare erreichbar? Layout korrekt?

- [ ] **Step 6: Log archivieren**

```bash
mkdir -p docs/publish-logs
cp publish/logs/publish-*.json docs/publish-logs/2026-04-16-force-all-migration.json
git add docs/publish-logs/2026-04-16-force-all-migration.json
git commit -m "docs: publish-pipeline force-all migration log"
```

---

## Phase 10 — GitHub-Actions-Workflow

### Task 22: CI-Workflow

**Files:**
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Workflow schreiben**

`.github/workflows/publish.yml`:

```yaml
name: Publish Nostr Events

on:
  push:
    branches: [main]
    paths: ['content/posts/**']
  workflow_dispatch:
    inputs:
      force_all:
        description: 'Publish all posts (--force-all)'
        type: boolean
        default: false

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Pre-Flight Check
        working-directory: ./publish
        env:
          BUNKER_URL: ${{ secrets.BUNKER_URL }}
          AUTHOR_PUBKEY_HEX: ${{ secrets.AUTHOR_PUBKEY_HEX }}
          BOOTSTRAP_RELAY: ${{ secrets.BOOTSTRAP_RELAY }}
        run: |
          deno run --allow-env --allow-read --allow-net src/cli.ts check

      - name: Publish
        working-directory: ./publish
        env:
          BUNKER_URL: ${{ secrets.BUNKER_URL }}
          AUTHOR_PUBKEY_HEX: ${{ secrets.AUTHOR_PUBKEY_HEX }}
          BOOTSTRAP_RELAY: ${{ secrets.BOOTSTRAP_RELAY }}
          GITHUB_EVENT_BEFORE: ${{ github.event.before }}
        run: |
          if [ "${{ github.event.inputs.force_all }}" = "true" ]; then
            deno run --allow-env --allow-read --allow-write=./logs --allow-net --allow-run=git src/cli.ts publish --force-all
          else
            deno run --allow-env --allow-read --allow-write=./logs --allow-net --allow-run=git src/cli.ts publish
          fi

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: publish-log
          path: ./publish/logs/publish-*.json
          retention-days: 30
```

- [ ] **Step 2: GitHub-Actions-Secrets anlegen (manueller Schritt)**

Settings → Secrets and variables → Actions → New repository secret:
- `BUNKER_URL`
- `AUTHOR_PUBKEY_HEX` = `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`
- `BOOTSTRAP_RELAY` = `wss://relay.primal.net`

- [ ] **Step 3: Alle Tests laufen**

Run: `cd publish && deno task test`
Expected: alle PASS.

- [ ] **Step 4: Commit und Push**

```bash
git add .github/workflows/publish.yml
git commit -m "publish(task 22): github-actions-workflow für auto-publish"
git push origin spa
```

- [ ] **Step 5: Workflow manuell triggern (ohne force)**

GitHub-UI → Actions → „Publish Nostr Events" → „Run workflow" → Branch `spa`. Erwartung: Check läuft grün, keine Content-Änderung → 0 Posts, Exit-Code 0.

- [ ] **Step 6: End-to-End-Test mit Content-Commit**

Minimalen Edit in einem Post machen, pushen. Workflow sollte automatisch triggern, Post re-publishen. Log-Artefakt prüfen.

---

## Phase 11 — Abschluss

### Task 23: Dokumentation aktualisieren

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: STATUS.md aktualisieren**

- §2 „Was auf Nostr liegt": Event-Zahl auf 18 aktualisieren, Blossom-Erläuterung („alle Bilder auf Blossom").
- §6 „Offene Punkte": Publish-Pipeline als erledigt markieren. Menü-Nav + Impressum + Cutover bleiben offen.

- [ ] **Step 2: HANDOFF.md aktualisieren**

- „Option 1 — Publish-Pipeline" → Status: erledigt.
- Neues „Was als Nächstes":
  - Option 2 (Menü-Navigation + Impressum)
  - Option 3 (Cutover: Hauptdomain `joerg-lohrer.de` auf SvelteKit umstellen — Voraussetzung Publish-Pipeline live; jetzt möglich).

- [ ] **Step 3: Commit**

```bash
git add docs/STATUS.md docs/HANDOFF.md
git commit -m "docs: publish-pipeline als erledigt markiert, cutover freigegeben"
```

---

### Task 24: Merge nach `main`

**Files:** keine.

- [ ] **Step 1: Alle Tests**

Run: `cd publish && deno task test`
Run: `cd app && npm run check && npm run test:unit && npm run test:e2e`
Expected: alle PASS.

- [ ] **Step 2: Push**

```bash
git push origin spa
```

- [ ] **Step 3: Mit User besprechen, ob `spa` → `main` gemergt wird**

Kein automatischer Merge. Entscheidung beim User. Ende.

---

## Gesamte Verifikation

- [ ] `cd publish && deno task test` → alle PASS.
- [ ] `cd publish && deno task check` → `✓ pre-flight ok`.
- [ ] `curl -sI https://svelte.joerg-lohrer.de/` → 200.
- [ ] `nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -s 'length'` → 18 oder mehr.
- [ ] GitHub Actions Workflow grün.

---

## Anhang — Modul-Referenz

| Modul | Verantwortung | Tests |
|---|---|---|
| `src/core/config.ts` | Env-Variable laden, validieren | `tests/config_test.ts` |
| `src/core/frontmatter.ts` | YAML-Frontmatter-Parsing, Body-Split | `tests/frontmatter_test.ts` |
| `src/core/validation.ts` | Slug-Regex, Post-Pflichtfelder | `tests/validation_test.ts` |
| `src/core/markdown.ts` | Bild-URL-Rewrite (mapping-basiert) | `tests/markdown_test.ts` |
| `src/core/event.ts` | `buildKind30023` | `tests/event_test.ts` |
| `src/core/relays.ts` | publish zu Relays, checkExisting | `tests/relays_test.ts` |
| `src/core/outbox.ts` | `kind:10002` Parser + Loader | `tests/outbox_test.ts` |
| `src/core/blossom-list.ts` | `kind:10063` Parser + Loader | `tests/blossom-list_test.ts` |
| `src/core/blossom.ts` | BUD-01 PUT /upload, Auth-Signing | `tests/blossom_test.ts` |
| `src/core/image-collector.ts` | Post-Ordner scannen (ignoriert Hugo-Derivate) | `tests/image-collector_test.ts` |
| `src/core/change-detection.ts` | Git-Diff, allPostDirs | `tests/change-detection_test.ts` |
| `src/core/log.ts` | Strukturiertes JSON-Log | `tests/log_test.ts` |
| `src/core/signer.ts` | NIP-46-Bunker-Wrapper | (integrated in check) |
| `src/subcommands/publish.ts` | `processPost`-Pipeline | `tests/publish_test.ts` |
| `src/subcommands/check.ts` | Pre-Flight-Aggregation | (integrated) |
| `src/subcommands/validate-post.ts` | Offline-Frontmatter-Check | `tests/validate-post_test.ts` |
| `src/cli.ts` | CLI-Entrypoint + Dispatch | (smoke-tested) |
