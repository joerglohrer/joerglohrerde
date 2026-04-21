# Prerender-Snapshot für Nostr-Langform-Posts — Design

**Stand:** 2026-04-21
**Scope:** SEO- und Social-Media-Tauglichkeit der Post-Detailseiten.
Post-URLs sollen beim ersten Request echtes HTML mit OG-Metadaten liefern —
ohne Runtime-Relay-Fetch, ohne Node-/Go-Server auf dem Hosting.

Schwester-Specs:
- [`2026-04-15-nostr-page-design.md`](2026-04-15-nostr-page-design.md) — SPA
- [`2026-04-15-publish-pipeline-design.md`](2026-04-15-publish-pipeline-design.md) — Publish
- [`2026-04-21-multilingual-posts-design.md`](2026-04-21-multilingual-posts-design.md) — Mehrsprachigkeit

## Problem

Aktueller Zustand: SvelteKit-SPA auf All-Inkl-Shared-Hosting mit
`adapter-static` + `fallback: 'index.html'`. Post-Detailseiten unter
`https://joerg-lohrer.de/<d-tag>/` liefern beim Erstaufruf die generische
`index.html` mit Homepage-OG-Defaults. Post-Titel, Summary, Cover-Bild
werden erst nach JavaScript-Ausführung aus den Relays geladen.

Daraus entstehen drei Defizite:

- **Social-Media-Previews** (LinkedIn, Mastodon, Bluesky, Signal, iMessage)
  zeigen nur die generischen Homepage-Tags, keine post-spezifischen.
- **Suchmaschinen** indexieren entweder nichts (kein crawler-readable
  Content zur Request-Zeit) oder zeigen Treffer ohne Titel/Snippet.
- **Accessibility-/No-JS-Nutzer** sehen leere Detailseiten.

## Ziel

Bei jedem HTTP-GET auf `https://joerg-lohrer.de/<d-tag>/` liefert
All-Inkl eine statische `<d-tag>/index.html`, die enthält:

- korrekter `<title>` und `<meta name="description">`
- vollständige OG-Tags (`og:title`, `og:description`, `og:image`,
  `og:locale`, `og:type=article`, `og:url`, `article:published_time`)
- Twitter-Cards (`summary_large_image`)
- `article`-JSON-LD-Schema für Google
- bidirektionale `<link rel="alternate" hreflang>` für Sprachvarianten
- vollständig gerenderten Post-Body (Markdown → HTML)

Die SPA hydriert über diesem HTML weiter und behält alle bisherigen
Laufzeit-Funktionen (Sprach-Switcher, Navigation, Reply-Loader).

## Nicht-Ziele

- **Kein generischer Nostr-Renderer.** Nur eigene `kind:30023`-Events mit
  bekannter Pubkey. Fremde Events werden nie unter der eigenen Domain
  gerendert (rechtliche Verantwortung nur für eigenen Content).
- **Kein Live-Proxy.** Relays werden zur Build-Zeit befragt, nicht pro
  HTTP-Request.
- **Keine Edge-Function, kein VPS, kein PHP-Shim.** Lösung funktioniert
  auf jedem Static-Hoster.
- **Kein Prerender für Listen-Seiten** (Homepage, Archiv) in dieser
  Iteration. Sie bleiben SPA-gerendert. Geteilt werden Artikel, nicht
  Listen.
- **Keine Änderung am Publish-Flow.** `publish`-Pipeline bleibt exakt
  wie heute (Git-MD → Nostr-Event).

## Grundprinzipien

- **Repo ist Quelle der Wahrheit im Autorenprozess.** Das bleibt.
- **Relays sind Ort der Wahrheit zum Build-Zeitpunkt.** Der Snapshot fragt
  die Relays, nicht das Repo. So werden auch Nostr-first publizierte
  Posts (die nicht im Repo liegen) beim nächsten Build mitgerendert.
- **Blaupausen-Qualität.** Das Snapshot-Tool soll auch andere
  Nostr-basierte Sites bedienen können. Keine harten Kopplungen an das
  Blog-Setup.
- **Entkoppelte Stufen.** `publish`, `snapshot`, `build+deploy` sind
  drei separate Kommandos. Sie können einzeln, hintereinander oder in
  unterschiedlichen Kontexten ausgeführt werden.

## Architektur

```
┌─────────────────────────────┐
│ 1. publish (Deno)           │  unverändert
│    Repo-MD → signed Event   │  → Relays
│    + Blossom-Upload         │  → GH-Actions-Trigger bei content/posts/**
└─────────────────────────────┘

┌─────────────────────────────┐
│ 2. snapshot (Deno, neu)     │  neu
│    Relays → JSON-Artefakte  │  schreibt snapshot/output/index.json
│    + NIP-09-Filter          │  schreibt snapshot/output/posts/<slug>.json
│    + Plausibilitätschecks   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 3. build+deploy (SvelteKit) │  erweitert
│    Prerender aus JSON       │  → build/<slug>/index.html
│    + FTPS-Sync nach All-Inkl│  → lftp mirror --delete
└─────────────────────────────┘
```

### Stufe 1 — `publish`

Unverändert. Diese Spec modifiziert publish **nicht**.

### Stufe 2 — `snapshot`

Neues Deno-Modul. Verzeichnis: `snapshot/` als Geschwister zu `publish/`.

**Input:**
- `AUTHOR_PUBKEY_HEX` (env, 64 hex chars)
- `BOOTSTRAP_RELAY` (env, wss-URL)
- `--out <path>` (default: `./output/`, relativ zum `snapshot/`-Modulverzeichnis)
- `--min-events <n>` (Plausibilitätsschwelle, absolute Zahl; ohne Flag:
  Last-known-good-Count aus Cache minus 2; ohne Cache: `1`)
- `--cache <path>` (default: `<out>/.last-snapshot.json`)

**Algorithmus:**

1. **Bootstrap.** `BOOTSTRAP_RELAY` anfragen, `kind:10002` des Autors
   holen → Read-Relay-Liste extrahieren. Fallback: `FALLBACK_READ_RELAYS`
   wenn `kind:10002` nicht ladbar.
2. **Event-Fetch.** Pro Read-Relay `kind:30023`, `authors:[pubkey]`
   parallel abfragen. Timeout 10 s pro Relay.
3. **Dedup per d-tag.** Bei Duplikaten höchster `created_at` gewinnt.
4. **NIP-09-Filter.** `kind:5`-Events des Autors laden. Für jedes
   `a`-Tag mit `30023:<pk>:<dtag>` den entsprechenden Eintrag verwerfen.
5. **Plausibilitätscheck:**
   - mindestens `ceil(N × 0.6)` der N Read-Relays müssen geantwortet haben
     (bei 5 Relays: 3, bei 3 Relays: 2) → sonst Hard-Fail
   - Event-Count ≥ `--min-events` → sonst Hard-Fail
   - Event-Count-Drop > 20 % gegenüber Cache → Hard-Fail
6. **Cover-Bild-Probe.** HEAD-Request auf `og:image`-Kandidat. Bei 200:
   als `url` schreiben. Bei Fehler: Fallback-Blossom prüfen, als `url`
   schreiben wenn verfügbar. Beide tot: primäre URL trotzdem schreiben +
   Warnung loggen (Blossom ist content-addressed, URL wird später wieder
   erreichbar sein).
7. **JSON-Output schreiben.**

**Output-Format:**

`<out>/index.json` — Gesamtkatalog:
```json
{
  "generated_at": "2026-04-21T10:30:00Z",
  "author_pubkey": "4fa5d1c4...",
  "relays_queried": ["wss://relay.damus.io", "..."],
  "relays_responded": ["wss://relay.damus.io", "..."],
  "post_count": 27,
  "posts": [
    {
      "slug": "bibel-selfies",
      "lang": "de",
      "created_at": 1713456789,
      "title": "Bibel-Selfies"
    }
  ]
}
```

`<out>/posts/<slug>.json` — pro Post:
```json
{
  "slug": "bibel-selfies",
  "event_id": "abc123...",
  "created_at": 1713456789,
  "published_at": 1713456000,
  "title": "Bibel-Selfies",
  "summary": "Kurzbeschreibung für OG und Google.",
  "lang": "de",
  "cover_image": {
    "url": "https://blossom.edufeed.org/<hash>.jpg",
    "fallback_url": "https://blossom.primal.net/<hash>.jpg",
    "width": 1600,
    "height": 900,
    "alt": "Alt-Text",
    "mime": "image/jpeg"
  },
  "content_markdown": "…full markdown…",
  "tags": ["Nostr", "Bibel"],
  "naddr": "naddr1...",
  "habla_url": "https://habla.news/a/naddr1...",
  "translations": [
    { "lang": "en", "slug": "bible-selfies" }
  ]
}
```

**Semantik der `cover_image`-Felder:**
- `url` → primäre Bild-URL, wird vom Prerender als `og:image`-Wert in
  den HTML-Head geschrieben. Crawler sehen nur diese URL.
- `fallback_url` → zweiter Blossom-Server mit demselben Hash (Blossom
  ist content-addressed). Informativ, kann von JS-Clients als Fallback
  genutzt werden. Nicht Teil der OG-Tags.

**CLI:**
```sh
cd snapshot
deno task snapshot                            # default
deno task snapshot --out ./out                # alternatives Ziel
deno task snapshot --min-events 20            # Schwelle
deno task snapshot --cache ./.last.json       # Vergleich
```

### Stufe 3 — `build+deploy`

Zwei Änderungen an der SvelteKit-SPA, eine Änderung am Deploy-Script.

**3.1 SvelteKit-Route `[...slug]/+page.ts`:**

```ts
import type { EntryGenerator, PageLoad } from './$types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const prerender = true;

const SNAPSHOT_DIR = resolve('../snapshot/output');

export const entries: EntryGenerator = () => {
  const catalog = JSON.parse(
    readFileSync(`${SNAPSHOT_DIR}/index.json`, 'utf-8')
  );
  return catalog.posts.map((p: { slug: string }) => ({ slug: p.slug }));
};

export const load: PageLoad = async ({ params }) => {
  const postData = JSON.parse(
    readFileSync(`${SNAPSHOT_DIR}/posts/${params.slug}.json`, 'utf-8')
  );
  return { dtag: params.slug, snapshot: postData };
};
```

**3.2 SvelteKit-Route `[...slug]/+page.svelte`:**

Die Route rendert den Snapshot-Content statt Relay-Fetch. Im
`<svelte:head>` werden alle Meta-Tags eingesetzt:

- `<title>` aus `snapshot.title`
- `<meta name="description">` aus `snapshot.summary`
- `<meta property="og:*">` aus Snapshot-Feldern
- `<meta name="twitter:*">` (summary_large_image)
- `<link rel="canonical">` auf `${SITE_URL}/${slug}/`
- `<link rel="alternate" hreflang="...">` für jede Translation
- `<link rel="alternate" hreflang="x-default">` auf DE-Slug
- `<script type="application/ld+json">` mit `Article`-Schema
- `<html lang="...">` aus `snapshot.lang` (via Layout)

Post-Content wird aus `snapshot.content_markdown` gerendert.
`ReplyList`/`ReplyComposer` bleiben clientseitig unverändert.

**3.3 Deploy-Script `scripts/deploy-svelte.sh`:**

FTPS-Upload wird auf `lftp mirror --delete` umgestellt, damit gelöschte
Posts (die nicht mehr im Build-Output stehen) auch auf dem Server
entfernt werden. Für die Site-Root wird `--exclude-glob` gesetzt, damit
nicht versehentlich Favicons/Hero-Bild gelöscht werden, die nicht Teil
des SvelteKit-Builds sind.

Kein weiteres Verhalten ändert sich.

## Mehrsprachigkeit

Pro Sprache ein Event mit eigenem d-tag (z.B. `bibel-selfies` /
`bible-selfies`). Das bestehende bidirektionale `a`-Tag mit Marker
`translation` (siehe `2026-04-21-multilingual-posts-design.md`) wird vom
Snapshot als `translations[]`-Array im JSON serialisiert.

Der Prerender generiert pro d-tag eine eigene `<slug>/index.html`.
`hreflang`-Links im `<head>` verweisen bidirektional auf die Pendants.
`x-default` zeigt auf den DE-Slug (Autor arbeitet DE-first).

UI-Chrome-Locale via `activeLocale`-Store bleibt vom Prerender
unabhängig — die URL bestimmt Post-Sprache (hart), der Store bestimmt
nur die UI-Sprache (weich, umschaltbar).

## Fehlerszenarien

| Szenario | Verhalten |
|---|---|
| < 40 % Relays down | Snapshot mergt, was da ist, fährt fort |
| ≥ 40 % Relays down | Hard-Fail, Output nicht überschrieben |
| Event-Count-Drop > 20 % | Hard-Fail |
| Blossom-Cover nicht erreichbar | Warnung loggen, URL trotzdem schreiben |
| NIP-09-gelöschter Post | Aus Katalog weggelassen, Deploy-Sync löscht HTML |
| Nostr-first-Post nicht im Repo | Wird trotzdem snapshot'd + gerendert |
| Alle Relays down | Hard-Fail, letzter Snapshot-Stand bleibt liegen |

## Rollback

**Snapshot-Ebene:** Der vorletzte Snapshot-Output bleibt als
`.last-snapshot.json` erhalten. Bei defektem Snapshot kann er manuell
wieder aktiviert werden.

**SPA-Ebene:** Reproduzierbar aus Git + Snapshot-JSONs.

**FTPS-Ebene:** Optional `tar.gz` des Webroots vor Upload (nicht Teil
der ersten Implementierung).

## Migrations-Weg

Inkrementell, jeder Schritt einzeln testbar und rollback-bar:

1. **Snapshot-Modul ergänzen.** `snapshot/` mit Deno-Task, CLI, Tests.
   Keine Änderung an SPA.
2. **Snapshot in CI einbauen.** GitHub-Actions-Schritt vor SvelteKit-Build.
3. **SvelteKit-Route auf Prerender umstellen.** `[...slug]/+page.ts`
   bekommt `prerender = true` + `entries()` + Load aus JSON.
4. **Cutover.** Laufzeit-Relay-Fetch in der Detail-Seite abschalten.
5. **Deploy-Script erweitern.** `lftp mirror --delete` für Sync.

## Blaupausen-Anforderungen

Damit das Tool als Vorlage für andere Nostr-Sites dient:

- **Konfiguration via env/CLI**, keine hart gecodeten Relay-Listen
- **JSON-Output als stabile Schnittstelle** — Renderer austauschbar
  (SvelteKit, Astro, Eleventy, …)
- **Dokumentiertes Minimum-Viable-Use-Interface:**
  ```sh
  export AUTHOR_PUBKEY_HEX="<64 hex>"
  export BOOTSTRAP_RELAY="wss://..."
  deno task snapshot --out ./my-site/snapshot-data
  # eigener Site-Builder liest ./my-site/snapshot-data/index.json
  ```
- **Explizite Grenzen:** nur kind:30023, nur eigener Pubkey, kein
  Live-Proxy — diese Beschränkungen sind Feature, nicht Bug.

## Offene Punkte

- Ob `--delete` des Deploy-Scripts auch den SvelteKit-Bundle-Hash-Mix
  sauber abbildet (wird `lftp` alte Hash-benannte JS-Bundles als
  „unbekannt" löschen und dabei einen halb-hochgeladenen Zustand
  produzieren?). Zu klären in der Implementierung.
- Ob der SvelteKit-Prerender deterministisch identische HTML für
  unveränderte Inputs produziert (für Diff-Builds / Cache-Invalidation).
  Vermutlich ja, nachprüfen.
