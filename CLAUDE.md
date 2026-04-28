# CLAUDE.md — Einstieg für Claude-Sessions

> **Rolle dieses Dokuments:** Session-Einstieg — Lese-Reihenfolge,
> Tonfall, kritische Fallstricke. Logbuch in [`docs/STATUS.md`](docs/STATUS.md),
> Konventionen in [`docs/HANDOFF.md`](docs/HANDOFF.md).

Dieser Einstieg ist für Claude-Code-Sessions gedacht. Für den inhaltlichen
Projektstand siehe [`docs/STATUS.md`](docs/STATUS.md) und
[`docs/HANDOFF.md`](docs/HANDOFF.md).

## Was dieses Repo ist

Die persönliche Webseite [`joerg-lohrer.de`](https://joerg-lohrer.de/) als
SvelteKit-SPA, die Blog-Posts live aus Nostr-Events (NIP-23, `kind:30023`)
auf 5 Public-Relays rendert. Seit 2026-04-21 mehrsprachig (DE/EN).

## Einstiegsreihenfolge

1. Diese Datei (Agent-Konventionen, Fallstricke).
2. [`docs/STATUS.md`](docs/STATUS.md) — wo steht alles gerade.
3. [`docs/HANDOFF.md`](docs/HANDOFF.md) — Alltags-Workflow, Stolperfallen.
4. Für konkrete Aufgaben: Spec unter `docs/superpowers/specs/`, Plan unter
   `docs/superpowers/plans/`.

## Sprache und Ton

- **Antworten und Commit-Messages auf Deutsch.**
- Code-Identifier auf Englisch.
- Kurz, konkret, kein Grundlagen-Tutorial. Jörg ist technisch versiert.
- Bei mehreren Wegen: 2–3 Varianten mit Empfehlung, nicht alles aufzählen.

## Commit-Konvention

- Conventional-Commit-Präfixe: `feat`, `fix`, `chore`, `docs`, `test`.
- Imperativ, Deutsch, Body erklärt das *Warum*.
- Co-Author immer ergänzen:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Kritische Fallstricke

### 1. Deploy-Target

`scripts/deploy-svelte.sh` hat `DEPLOY_TARGET=svelte` als Default —
das zielt auf `svelte.joerg-lohrer.de`, NICHT auf die Produktion.

Für Live-Deploy auf `joerg-lohrer.de`:

```sh
DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh
```

**Immer explizit setzen.** Der stumme Default-Fehler ist nur sichtbar,
wenn man die Live-Seite kontrolliert. Reproduzierbar als Memory-Entry
im Claude-Memory-System.

### 2. zsh-Globbing mit eckigen Klammern

SvelteKit-Routen wie `app/src/routes/[...slug]/+page.svelte` enthalten
eckige Klammern, die zsh als Glob-Pattern interpretiert. Pfade IMMER in
einfachen Anführungszeichen:

```sh
git add 'app/src/routes/[...slug]/+page.svelte'
```

### 3. Forgejo → GitHub Push-Mirror

`git push` landet zuerst auf Forgejo (`forgejo.joerglohrer.synology.me`).
Der Forgejo-Mirror synct dann zu GitHub (typisch 30–90 s). Die GitHub-
Action (Publish-Pipeline) läuft erst nach dem Mirror. Wer direkt nach
`git push` `gh run list` aufruft, sieht evtl. noch keinen neuen Run.

### 4. Deno-Path-Konventionen

Publish-Pipeline läuft aus `publish/` (CWD), daher sind Pfade relativ
mit `../content/posts/...`. Git-Diff liefert aber repo-root-relative
Pfade (`content/posts/...`). `changedPostDirs` normalisiert beides —
wenn `posts=0` obwohl Änderungen vorliegen, ist das der Hotspot.

### 5. Snapshot-Output muss vor `npm run build` da sein

SvelteKit prerendert `[...slug]/+page.{ts,svelte}` aus
`snapshot/output/`-JSONs (`index.json` + `posts/<slug>.json`). Lokal
buildst du nicht direkt mit `npm run build`, sondern via
`./scripts/deploy-svelte.sh` — das ruft vorher `deno task snapshot`
auf. Wer `cd app && npm run build` direkt nach dem Clone macht, ohne
vorher `cd snapshot && deno task snapshot` auszuführen, scheitert
mit `ENOENT snapshot/output/index.json`.

### 6. Publish-Pipeline erwartet `content/posts/<lang>/<slug>/`

Die Zwei-Ebenen-Struktur ist Teil der Traversierung. Wer einen Post
versehentlich in `content/posts/<slug>/` (ohne Sprach-Ordner) anlegt,
wird von der Pipeline ignoriert.

## Hauptarbeitsbereiche im Repo

| Pfad | Inhalt |
|---|---|
| `content/posts/<lang>/<slug>/index.md` | Markdown-Posts pro Sprache |
| `app/src/lib/i18n/` | UI-Lokalisierung (svelte-i18n, activeLocale-Store) |
| `app/src/lib/nostr/` | Relay-Loader, Translations-Resolving |
| `app/src/lib/components/` | Svelte-5-Runes-Komponenten |
| `app/src/routes/` | SvelteKit-Routen (Layout, Home, Archiv, Post, Impressum) |
| `publish/src/` | Deno-Publish-Pipeline (Deno-Tasks in `publish/deno.jsonc`) |
| `publish/tests/` | Deno-Tests für die Pipeline |
| `snapshot/src/` | Deno-Snapshot-Tool (Relays → JSON für Prerender) |
| `snapshot/tests/` | Deno-Tests für den Snapshot |
| `snapshot/output/` | (gitignored) build-zeit-JSON, wird vom SvelteKit-Prerender konsumiert |
| `docs/superpowers/specs/` | Produktdesigns, Konventionen |
| `docs/superpowers/plans/archive/` | Umgesetzte Implementierungspläne (Geschichte) |
| `scripts/deploy-svelte.sh` | FTPS-Deploy |

## Quick-Links

- [Produktspezifikation SPA](docs/superpowers/specs/2026-04-15-nostr-page-design.md)
- [Produktspezifikation Publish-Pipeline](docs/superpowers/specs/2026-04-15-publish-pipeline-design.md)
- [Bild-Metadaten-Konvention](docs/superpowers/specs/2026-04-16-image-metadata-convention.md)
- [Multilingual-Design](docs/superpowers/specs/2026-04-21-multilingual-posts-design.md)
- [Prerender-Snapshot-Design](docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md) (Entwurf, eingefroren)
- [Repo-Workflow-Skill](.claude/skills/joerglohrerde-workflow.md) (ausführlicher, mit Kommandos)
