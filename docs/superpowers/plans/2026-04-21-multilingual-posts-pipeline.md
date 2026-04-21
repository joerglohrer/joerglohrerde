# Multilinguale Posts — Repo-Struktur & Publish-Pipeline (Plan 1/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Posts können im Repo unter `content/posts/<lang>/<slug>/` liegen; das Deno-Publish-Skript traversiert die neue Struktur korrekt, erzeugt `kind:30023`-Events mit `l`-Tag (bereits vorhanden) und optionalen `a`-Tag-Verweisen auf andere Sprach-Varianten (neu). Die 26 bestehenden Posts werden unter `de/` einsortiert.

**Architecture:** Der einzige Code-Change liegt in `publish/` (Deno-Pipeline). Die Traversierungs-Funktionen (`allPostDirs`, `filterPostDirs`) lernen eine zusätzliche Verzeichnisebene. `buildKind30023` erhält optionale `a`-Tags aus dem Frontmatter. Die 8 Bestandsposts werden per `git mv` unter `content/posts/de/` verschoben und per `publish --force-all` re-publisht — selber `d`-tag, selber Content, nur Event-Erzeugung läuft durch die neue Pipeline.

**Tech Stack:** Deno, TypeScript, `@std/yaml`, `@std/path`, `@std/assert` für Tests. Bestehende Test-Infrastruktur unter `publish/tests/`.

---

## Spec-Referenz

Umsetzt die Abschnitte **Content-Struktur**, **Frontmatter**, **nostr-Event-Mapping**, **Publish-Pipeline** und **Migration bestehender Posts** aus `docs/superpowers/specs/2026-04-21-multilingual-posts-design.md`. Out-of-scope in diesem Plan: SPA-Änderungen (Plan 2) und UI-Lokalisierung via `svelte-i18n` (Plan 3).

## Datei-Struktur

**Zu ändern:**
- `publish/src/core/change-detection.ts` — `filterPostDirs` und `allPostDirs` lernen Sprach-Ebene.
- `publish/src/core/frontmatter.ts` — Interface `Frontmatter` um optionales `a`-Feld ergänzen.
- `publish/src/core/event.ts` — `buildKind30023` übernimmt `a`-Tags aus `fm.a` als `["a", coord, "", "translation"]`.
- `publish/src/core/validation.ts` — leichte `a`-tag-Format-Prüfung.
- `publish/tests/change-detection_test.ts` — neue Tests für Sprach-Ebene.
- `publish/tests/event_test.ts` — neue Tests für `a`-tag-Übernahme.
- `publish/tests/frontmatter_test.ts` — Test für `a`-Feld-Parsing.
- `publish/tests/validation_test.ts` — Test für `a`-Format-Fehler.

**Repo-Content-Umbau (kein Code):**
- Alle 26 Unterordner von `content/posts/` → nach `content/posts/de/` verschieben.
- In jedem `index.md` Frontmatter: `lang: de` sicherstellen; auskommentierten `a`-Platzhalter ergänzen.

**Nicht angefasst:**
- `publish/src/subcommands/publish.ts` — liest `postDir` ohnehin als opakes Verzeichnis; erhält die bereits um eine Ebene tiefere Pfade unverändert weitergereicht.
- `publish/src/cli.ts` — `resolvePostDirs` nutzt `allPostDirs`/`changedPostDirs`, die wir anpassen; keine eigene Änderung nötig, solange Interface gleich bleibt.
- GitHub-Action `.github/workflows/publish.yml` — ruft CLI mit Env-Variablen, unverändert.

---

## Task 1: Traversierung — Tests für Sprach-Ebene in `filterPostDirs`

**Files:**
- Test: `publish/tests/change-detection_test.ts`

- [ ] **Step 1: Failing Tests schreiben**

Ergänze in `publish/tests/change-detection_test.ts` nach dem letzten bestehenden Test (hinter `Deno.test('changedPostDirs: ...', ...)`):

```typescript
Deno.test('filterPostDirs: extrahiert post-ordner mit sprach-ebene', () => {
  const lines = [
    'content/posts/de/a/index.md',
    'content/posts/en/b/image.png',
    'content/posts/de/c/index.md',
    'README.md',
  ]
  assertEquals(
    filterPostDirs(lines, 'content/posts').sort(),
    ['content/posts/de/a', 'content/posts/de/c', 'content/posts/en/b'],
  )
})

Deno.test('filterPostDirs: ignoriert dateien direkt unter lang-ordner', () => {
  const lines = [
    'content/posts/de/index.md',
    'content/posts/de/README.md',
    'content/posts/de/x/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/de/x'])
})

Deno.test('filterPostDirs: _drafts unter sprach-ebene wird ignoriert', () => {
  const lines = [
    'content/posts/de/_drafts/x/index.md',
    'content/posts/de/real/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/de/real'])
})
```

- [ ] **Step 2: Tests laufen, Erwartung FAIL**

Run:
```bash
cd publish && deno test tests/change-detection_test.ts
```

Expected: Die drei neuen Tests schlagen fehl (alte Regex kennt nur eine Ebene). Bestehende Tests bleiben grün.

- [ ] **Step 3: Commit der Tests**

```bash
git add publish/tests/change-detection_test.ts
git commit -m "test: filterPostDirs für sprach-ebene (failing)"
```

---

## Task 2: Traversierung — `filterPostDirs` auf Sprach-Ebene umstellen

**Files:**
- Modify: `publish/src/core/change-detection.ts`

- [ ] **Step 1: Regex um Sprach-Ebene erweitern**

In `publish/src/core/change-detection.ts`, ersetze den Block in `filterPostDirs` ab `const indexRe = ...` bis `return [...dirs].sort()` durch:

```typescript
  const indexRe = new RegExp(`^${escapeRegex(prefix)}([a-z]{2})/([^/]+)/index\\.md$`)
  const assetRe = new RegExp(`^${escapeRegex(prefix)}([a-z]{2})/([^/]+)/`)
  const dirs = new Set<string>()
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    const indexMatch = l.match(indexRe)
    if (indexMatch) {
      const [, lang, slug] = indexMatch
      if (slug.startsWith('_')) continue
      dirs.add(`${prefix}${lang}/${slug}`)
      continue
    }
    const assetMatch = l.match(assetRe)
    if (assetMatch && !l.endsWith('.md')) {
      const [, lang, slug] = assetMatch
      if (slug.startsWith('_')) continue
      dirs.add(`${prefix}${lang}/${slug}`)
    }
  }
  return [...dirs].sort()
```

Und entferne die obsolete Zeile `const drafts = prefix + '_'` samt der dazugehörigen `if (l.startsWith(drafts)) continue` — wir filtern jetzt auf Slug-Ebene.

- [ ] **Step 2: Tests laufen, Erwartung PASS**

Run:
```bash
cd publish && deno test tests/change-detection_test.ts
```

Expected: Alle Tests grün. Falls ein bestehender Test (`filterPostDirs: extrahiert post-ordner aus dateipfaden (content/posts)`) rot wird: Das ist beabsichtigt — er testet die alte flache Struktur. Passe ihn an, indem du die Eingabe-Pfade um `/de/` ergänzt:

```typescript
// alter Test — Eingabe aktualisieren:
Deno.test('filterPostDirs: extrahiert post-ordner aus dateipfaden (content/posts)', () => {
  const lines = [
    'content/posts/de/a/index.md',
    'content/posts/de/b/image.png',
    'content/posts/de/c/other.md',
    'README.md',
    'app/src/lib/x.ts',
  ]
  assertEquals(
    filterPostDirs(lines, 'content/posts').sort(),
    ['content/posts/de/a', 'content/posts/de/b'],
  )
})

// alter Test — Eingabe aktualisieren:
Deno.test('filterPostDirs: respektiert alternativen root (blog/)', () => {
  const lines = [
    'blog/de/x/index.md',
    'blog/en/y/pic.png',
    'content/posts/de/z/index.md',
    'README.md',
  ]
  assertEquals(filterPostDirs(lines, 'blog').sort(), ['blog/de/x', 'blog/en/y'])
})

// alter Test — Eingabe aktualisieren:
Deno.test('filterPostDirs: ignoriert _drafts und non-index.md', () => {
  const lines = [
    'content/posts/de/a/index.md',
    'content/posts/de/a/extra.md',
    'content/posts/de/_drafts/x/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/de/a'])
})
```

Re-Run `deno test tests/change-detection_test.ts` → alle PASS.

- [ ] **Step 3: Commit**

```bash
git add publish/src/core/change-detection.ts publish/tests/change-detection_test.ts
git commit -m "feat(publish): filterPostDirs traversiert sprach-ebene"
```

---

## Task 3: Traversierung — `allPostDirs` auf Sprach-Ebene umstellen

**Files:**
- Test: `publish/tests/change-detection_test.ts`
- Modify: `publish/src/core/change-detection.ts`

- [ ] **Step 1: Failing Test schreiben**

`allPostDirs` hat bisher keinen Test. Ergänze am Ende von `publish/tests/change-detection_test.ts`:

```typescript
import { allPostDirs } from '../src/core/change-detection.ts'

Deno.test('allPostDirs: findet posts in sprach-unterordnern', async () => {
  const tmp = await Deno.makeTempDir()
  try {
    await Deno.mkdir(`${tmp}/de/alpha`, { recursive: true })
    await Deno.writeTextFile(`${tmp}/de/alpha/index.md`, '---\n---')
    await Deno.mkdir(`${tmp}/de/beta`, { recursive: true })
    await Deno.writeTextFile(`${tmp}/de/beta/index.md`, '---\n---')
    await Deno.mkdir(`${tmp}/en/alpha`, { recursive: true })
    await Deno.writeTextFile(`${tmp}/en/alpha/index.md`, '---\n---')
    await Deno.mkdir(`${tmp}/de/_draft/index`, { recursive: true })
    await Deno.writeTextFile(`${tmp}/de/_draft/index.md`, '---\n---')

    const result = await allPostDirs(tmp)
    assertEquals(
      result.sort(),
      [`${tmp}/de/alpha`, `${tmp}/de/beta`, `${tmp}/en/alpha`].sort(),
    )
  } finally {
    await Deno.remove(tmp, { recursive: true })
  }
})
```

Falls der `allPostDirs`-Import schon oben in der Datei vorhanden ist (weil der Block zu `changedPostDirs` ihn mit-importiert): den doppelten Import weglassen und stattdessen die bestehende `import { ... } from '../src/core/change-detection.ts'`-Zeile erweitern.

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd publish && deno test tests/change-detection_test.ts
```

Expected: Neuer Test schlägt fehl, weil `allPostDirs` nur eine Ebene tief liest.

- [ ] **Step 3: `allPostDirs` auf Sprach-Ebene anpassen**

In `publish/src/core/change-detection.ts`, ersetze die Funktion `allPostDirs` komplett durch:

```typescript
export async function allPostDirs(contentRoot: string): Promise<string[]> {
  const result: string[] = []
  for await (const langEntry of Deno.readDir(contentRoot)) {
    if (!langEntry.isDirectory) continue
    if (!/^[a-z]{2}$/.test(langEntry.name)) continue
    const langDir = `${contentRoot}/${langEntry.name}`
    for await (const postEntry of Deno.readDir(langDir)) {
      if (!postEntry.isDirectory) continue
      if (postEntry.name.startsWith('_')) continue
      const indexPath = `${langDir}/${postEntry.name}/index.md`
      try {
        const stat = await Deno.stat(indexPath)
        if (stat.isFile) result.push(`${langDir}/${postEntry.name}`)
      } catch {
        // skip folders without index.md
      }
    }
  }
  return result.sort()
}
```

- [ ] **Step 4: Tests laufen, Erwartung PASS**

Run:
```bash
cd publish && deno test tests/change-detection_test.ts
```

Expected: Alle grün.

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/change-detection.ts publish/tests/change-detection_test.ts
git commit -m "feat(publish): allPostDirs traversiert sprach-ebene"
```

---

## Task 4: Frontmatter — `a`-Feld parsen

**Files:**
- Test: `publish/tests/frontmatter_test.ts`
- Modify: `publish/src/core/frontmatter.ts`

- [ ] **Step 1: Failing Test schreiben**

Ergänze in `publish/tests/frontmatter_test.ts` (am Ende):

```typescript
Deno.test('parseFrontmatter: liest a-tag-liste aus frontmatter', () => {
  const md = [
    '---',
    'title: T',
    'slug: s',
    'date: 2024-01-01',
    'a:',
    '  - "30023:abc:other-slug"',
    '---',
    'body',
  ].join('\n')
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.a, ['30023:abc:other-slug'])
})

Deno.test('parseFrontmatter: a fehlt → undefined', () => {
  const md = '---\ntitle: T\nslug: s\ndate: 2024-01-01\n---\nbody'
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.a, undefined)
})
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd publish && deno test tests/frontmatter_test.ts
```

Expected: Neue Tests schlagen fehl (TypeError auf `fm.a`, weil Feld im Interface nicht deklariert ist — oder: beide PASS, weil YAML ein Array ohnehin durchreicht. Falls beide PASS: weiter zu Step 3 für die Interface-Deklaration; der Test dokumentiert dann nur das gewollte Verhalten).

- [ ] **Step 3: Interface `Frontmatter` erweitern**

In `publish/src/core/frontmatter.ts`, ergänze im Interface `Frontmatter` vor `[key: string]: unknown` die Zeile:

```typescript
  a?: string[]
```

- [ ] **Step 4: Tests laufen, Erwartung PASS**

Run:
```bash
cd publish && deno test tests/frontmatter_test.ts
```

Expected: Alle grün.

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/frontmatter.ts publish/tests/frontmatter_test.ts
git commit -m "feat(publish): Frontmatter unterstützt a-tag-liste"
```

---

## Task 5: Validierung — `a`-Tag-Format prüfen

**Files:**
- Test: `publish/tests/validation_test.ts`
- Modify: `publish/src/core/validation.ts`

- [ ] **Step 1: Failing Tests schreiben**

Ergänze in `publish/tests/validation_test.ts` (am Ende):

```typescript
Deno.test('validatePost: akzeptiert a-tag im korrekten format', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['30023:abcdef0123456789:other-slug'],
  } as Frontmatter
  validatePost(fm) // wirft nicht
})

Deno.test('validatePost: lehnt a-tag mit falschem format ab', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['nur-ein-string'],
  } as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'invalid a-tag')
})

Deno.test('validatePost: lehnt a-tag mit fehlendem d-tag ab', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['30023:abcdef:'],
  } as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'invalid a-tag')
})
```

Stelle sicher, dass die Imports oben in der Datei `assertThrows` enthalten (ggf. ergänzen: `import { assertEquals, assertThrows } from '@std/assert'`). Falls `Frontmatter` noch nicht importiert ist: `import type { Frontmatter } from '../src/core/frontmatter.ts'` ergänzen.

- [ ] **Step 2: Tests laufen, Erwartung FAIL**

Run:
```bash
cd publish && deno test tests/validation_test.ts
```

Expected: Die beiden Negativ-Tests schlagen fehl (keine Validierung vorhanden).

- [ ] **Step 3: Validierung implementieren**

In `publish/src/core/validation.ts`, ergänze vor dem Ende der Funktion `validatePost` (nach der Date-Prüfung):

```typescript
  if (fm.a !== undefined) {
    if (!Array.isArray(fm.a)) {
      throw new Error('a must be a list of strings')
    }
    const coordRe = /^\d+:[0-9a-f]+:[a-z0-9][a-z0-9-]*$/
    for (const coord of fm.a) {
      if (typeof coord !== 'string' || !coordRe.test(coord)) {
        throw new Error(`invalid a-tag: "${coord}" (expected "<kind>:<pubkey-hex>:<d-tag>")`)
      }
    }
  }
```

- [ ] **Step 4: Tests laufen, Erwartung PASS**

Run:
```bash
cd publish && deno test tests/validation_test.ts
```

Expected: Alle grün.

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/validation.ts publish/tests/validation_test.ts
git commit -m "feat(publish): validatePost prüft a-tag-format"
```

---

## Task 6: Event-Mapping — `a`-Tags aus Frontmatter übernehmen

**Files:**
- Test: `publish/tests/event_test.ts`
- Modify: `publish/src/core/event.ts`

- [ ] **Step 1: Failing Test schreiben**

Ergänze in `publish/tests/event_test.ts` (am Ende — falls der Import-Block oben `buildKind30023` und `Frontmatter` noch nicht hat, hinzufügen):

```typescript
Deno.test('buildKind30023: schreibt a-tags aus frontmatter mit marker "translation"', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01T00:00:00Z'),
    lang: 'de',
    a: [
      '30023:0123456789abcdef:other-slug',
      '30023:0123456789abcdef:third-slug',
    ],
  } as Frontmatter
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body',
    coverUrl: undefined,
    pubkeyHex: '0123456789abcdef',
    clientTag: '',
    nowSeconds: 1700000000,
  })
  const aTags = ev.tags.filter((t) => t[0] === 'a')
  assertEquals(aTags, [
    ['a', '30023:0123456789abcdef:other-slug', '', 'translation'],
    ['a', '30023:0123456789abcdef:third-slug', '', 'translation'],
  ])
})

Deno.test('buildKind30023: ohne a im frontmatter keine a-tags im event', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01T00:00:00Z'),
    lang: 'de',
  } as Frontmatter
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body',
    coverUrl: undefined,
    pubkeyHex: '0123456789abcdef',
    clientTag: '',
    nowSeconds: 1700000000,
  })
  assertEquals(ev.tags.filter((t) => t[0] === 'a'), [])
})
```

- [ ] **Step 2: Test laufen, Erwartung FAIL**

Run:
```bash
cd publish && deno test tests/event_test.ts
```

Expected: Erster neuer Test schlägt fehl (keine `a`-Tag-Erzeugung), zweiter läuft möglicherweise durch.

- [ ] **Step 3: `buildKind30023` erweitern**

In `publish/src/core/event.ts`, ergänze nach dem bestehenden `if (clientTag) tags.push(['client', clientTag])`-Block und **vor** `if (additionalTags) tags.push(...additionalTags)`:

```typescript
  if (Array.isArray(fm.a)) {
    for (const coord of fm.a) {
      tags.push(['a', coord, '', 'translation'])
    }
  }
```

- [ ] **Step 4: Tests laufen, Erwartung PASS**

Run:
```bash
cd publish && deno test tests/event_test.ts
```

Expected: Alle grün.

- [ ] **Step 5: Commit**

```bash
git add publish/src/core/event.ts publish/tests/event_test.ts
git commit -m "feat(publish): buildKind30023 übernimmt a-tags aus frontmatter"
```

---

## Task 7: Gesamt-Testlauf & Typ-Check

**Files:** — (nur Testlauf)

- [ ] **Step 1: Alle Tests im Publish-Subdir**

Run:
```bash
cd publish && deno test
```

Expected: Alle Tests grün. Falls rot: Fehler beheben, bevor die Repo-Migration startet.

- [ ] **Step 2: Deno-Typecheck gesamtes Publish-Modul**

Run:
```bash
cd publish && deno check src/cli.ts
```

Expected: Keine Typ-Fehler.

- [ ] **Step 3: Kein Commit nötig** (reiner Verifikations-Schritt).

---

## Task 8: Repo-Migration — bestehende Posts nach `content/posts/de/`

**Files:**
- Move: alle Unterordner von `content/posts/` → `content/posts/de/`
- Modify: jeder `content/posts/de/<slug>/index.md` (Frontmatter ergänzen)

- [ ] **Step 1: `de/`-Zielordner anlegen**

```bash
mkdir -p content/posts/de
```

- [ ] **Step 2: Alle Post-Ordner verschieben (mit `git mv`)**

```bash
for dir in content/posts/*/; do
  name=$(basename "$dir")
  [ "$name" = "de" ] && continue
  git mv "$dir" "content/posts/de/$name"
done
```

Expected: `git status` zeigt 26 Renames unter `content/posts/<slug>` → `content/posts/de/<slug>`.

Verifizieren:
```bash
ls content/posts/de/ | wc -l
```
Expected: `26`

- [ ] **Step 3: `lang: de` in jedem Frontmatter sicherstellen**

Prüfe zunächst, wie viele Posts `lang:` bereits haben:

```bash
for f in content/posts/de/*/index.md; do
  head -20 "$f" | grep -q "^lang:" || echo "FEHLT: $f"
done
```

Expected: Leere Ausgabe (alle haben `lang:`) oder eine Liste der Dateien, in denen `lang: de` manuell zu ergänzen ist.

Für jede gelistete Datei: Frontmatter öffnen und `lang: de` in einer neuen Zeile vor dem schließenden `---` ergänzen. (Wenn `lang:` fehlt, manuell mit Editor ergänzen; kein Skript nötig bei wenigen Dateien.)

- [ ] **Step 4: Auskommentierten `a`-Platzhalter ergänzen**

Als Konvention fügen wir in jedem Frontmatter direkt vor dem schließenden `---` den Platzhalter ein. Manuell pro Datei (oder via Editor-Makro) — Beispiel am Ende des bestehenden Frontmatter-Blocks:

```yaml
# a:
#   - "30023:<pubkey-hex>:<slug-der-anderssprachigen-variante>"
```

Überprüfen:
```bash
grep -L "^# a:" content/posts/de/*/index.md
```

Expected: Leere Ausgabe (alle Dateien haben den Platzhalter).

- [ ] **Step 5: Dry-Run-Publish auf einem einzelnen Post**

```bash
cd publish && deno run -A src/cli.ts publish --dry-run --post bibel-selfies
```

Expected: Ausgabe ähnlich `dry-run: ../content/posts/de/2025-04-17-bibel-selfies`, Exit 0. Falls der Pfad falsch aufgelöst wird: zurück zu Task 2/3, Traversierungs-Logik prüfen.

- [ ] **Step 6: Commit**

```bash
git add content/posts/
git commit -m "chore: posts nach content/posts/de/ migriert, a-tag-platzhalter ergänzt"
```

---

## Task 9: Re-Publish der Bestandsposts

**Files:** — (kein Code, nur CLI-Aufruf)

- [ ] **Step 1: Publish-Konfiguration prüfen**

Run (im Repo-Root):
```bash
cd publish && deno run -A src/cli.ts check
```

Expected: Alle Checks OK (Bunker, Relays, Blossom). Falls FAIL: erst beheben.

- [ ] **Step 2: Re-Publish aller Posts mit `--force-all`**

```bash
cd publish && deno run -A src/cli.ts publish --force-all
```

Expected: 26 Posts durchlaufen, alle mit Status `success` und `action: update` (selber `d`-tag wie zuvor → NIP-33-Replacement greift). Log landet unter `publish/logs/publish-<timestamp>.json`.

- [ ] **Step 3: Log-Inspektion**

```bash
ls -t publish/logs/ | head -1 | xargs -I{} cat publish/logs/{} | head -100
```

Expected: JSON-Log zeigt pro Post `l`-Tag im Event (sichtbar als `["l", "de", "ISO-639-1"]` im Event-Dump, falls im Log enthalten) und keine Fehler. Falls ein Post auf `action: new` statt `update` landet, ist das ein Hinweis auf geänderten `d`-tag — prüfen.

- [ ] **Step 4: Kein neuer Commit nötig** — Re-Publish ändert nur nostr-Events, kein Repo-Zustand.

---

## Task 10: Ende-zu-Ende-Verifikation

**Files:** — (Verifikation)

- [ ] **Step 1: Prüfe auf einem Relay, dass einer der Events den `l`-Tag trägt**

Wähle einen Post (z. B. `bibel-selfies`) und frage über `nak` oder einen Nostr-Client das neueste Event mit `kind:30023`, `author=<pubkey>`, `d=bibel-selfies` ab. Bestätige die Tags enthalten:

```
["L", "ISO-639-1"]
["l", "de", "ISO-639-1"]
```

Falls nicht verfügbar: Dump aus dem Publish-Log (`publish/logs/publish-*.json`, Feld `eventId`) nutzen und das Event via Nostr-Tool oder existierender SPA prüfen.

- [ ] **Step 2: GitHub-Action smoke-test**

Commit einen harmlosen Änderung in einem einzelnen Post (z. B. ein Leerzeichen im Body) und push:

```bash
echo "" >> content/posts/de/2025-04-17-bibel-selfies/index.md
git commit -am "test: trigger github-action nach struktur-migration"
git push
```

Expected: GitHub-Action (`publish.yml`) läuft durch, findet den einen geänderten Post über `changedPostDirs`, re-publisht erfolgreich. Logs unter Actions-Tab prüfen.

Falls die Action fehlschlägt, meist: `filterPostDirs` liest `git diff`-Zeilen anders als im Test angenommen — zurück zu Task 2.

- [ ] **Step 3: Kein Commit nötig** (der Test-Commit aus Step 2 bleibt).

---

## Fertig

Nach Task 10:
- Repo-Struktur ist `content/posts/<lang>/<slug>/` — lauffähig und testbar.
- Publish-Pipeline traversiert die neue Struktur korrekt, erzeugt `l`- und `a`-Tags aus dem Frontmatter.
- 20 Bestandsposts sind unter `de/` einsortiert und frisch re-publisht; Event-Zustand auf Relays ist konsistent mit Repo-Zustand.
- GitHub-Action läuft weiterhin automatisch.

**Nächster Plan (separat zu schreiben):** SPA liest `a`-Tags, zeigt „Also available in …"-Hinweis, Sprachwahl-Umschalter.
