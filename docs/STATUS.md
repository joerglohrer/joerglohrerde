# Projekt-Status: joerg-lohrer.de → Nostr-basierte SPA

> **Rolle dieses Dokuments:** Logbuch — aktueller Stand und Erledigt-Chronologie.
> Konventionen und Workflows stehen in [`HANDOFF.md`](HANDOFF.md).

**Stand:** 2026-04-28 (Prerender-Snapshot live auf svelte-subdomain)

## Kurzfassung

`joerg-lohrer.de` läuft als SvelteKit-SPA, die Blog-Posts live aus
signierten Nostr-Events (NIP-23, `kind:30023`) auf 5 Public-Relays rendert.
Bilder liegen content-addressed auf 2 Blossom-Servern. Die Hugo-basierte
Altseite ist als `hugo-archive`-Branch eingefroren.

**Seit 2026-04-28 prerender-snapshot:** Post-Detailseiten werden zur
Build-Zeit prerendered, mit vollen OG-/Twitter-/JSON-LD-Tags. Ein Deno-
Tool (`snapshot/`) liest die Events von den Relays und schreibt sie als
JSON-Artefakte; SvelteKit baut daraus `<slug>/index.html` mit korrekten
Meta-Tags. Crawler und Social-Media-Vorschauen sehen jetzt echte Titel,
Beschreibungen, Cover-Bilder. Live verifiziert auf `svelte.joerg-lohrer.de`,
prod-merge ausstehend.

**Seit 2026-04-21 multilingual:** UI-Chrome (Menü, Footer, Post-Meta)
in Deutsch und Englisch via `svelte-i18n`, mit Browser-Locale-Default,
`localStorage`-Persistenz und Header-Sprachswitcher. Inhalte pro Sprache
als eigene `kind:30023`-Events, verlinkt über bidirektionale
NIP-33-`a`-Tags mit Marker `translation`; Listen-Seiten filtern nach
aktivem Locale. Eine englische Übersetzung existiert bereits
(`bible-selfies`) und dient als lebendes Referenzbeispiel.

**Das inhaltliche Kernziel des Gesamtprojekts ist erreicht.**

## Live-URLs

| URL | Status | Rolle |
|---|---|---|
| `https://joerg-lohrer.de/` | live | **Produktion**, SvelteKit-SPA (Cutover 2026-04-18) |
| `https://staging.joerg-lohrer.de/` | live | **Staging**, letzter Pre-Prod-Build |
| `https://svelte.joerg-lohrer.de/` | live | **Entwicklung**, Deploy-Target der Pipeline |
| `https://spa.joerg-lohrer.de/` | live | **Historisch**, Vanilla-HTML-Mini-Spike |

## Was auf Nostr liegt

- **Autoren-Pubkey:** `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
  (hex: `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`)
- **NIP-05:** `joerglohrer@joerg-lohrer.de` (via `/.well-known/nostr.json`)
- **Publizierte Events:** **27 Langform-Posts** (`kind:30023`) —
  26 Deutsch + 1 Englisch. 26 Alt-Posts (18 Hugo-Migration + 8 Client-
  Reimport) tragen seit 2026-04-21 konsistent `lang: de` im Frontmatter,
  `bible-selfies` (EN, 2026-04-21) verweist bidirektional auf `bibel-selfies`
  via NIP-33-`a`-Tag mit Marker `translation`.
- **NIP-32-Sprach-Tags:** Alle Events tragen `['L', 'ISO-639-1']` +
  `['l', <lang>, 'ISO-639-1']`. Deutsche Events haben `lang=de`, englische
  `lang=en`. Ergänzt durch `['a', '<kind>:<pubkey>:<d-tag>', '', 'translation']`
  bei verknüpften Sprach-Varianten.
- **Relay-Liste** (`kind:10002`): `relay.damus.io`, `nos.lol`,
  `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`
- **Blossom-Server** (`kind:10063`): `blossom.edufeed.org`, `blossom.primal.net`
- **91 Bilder** auf beiden Blossom-Servern, alle Events enthalten
  hash-basierte Blossom-URLs.

## Repo-Struktur

```
joerglohrerde/
├── content/posts/<lang>/<slug>/   # Markdown-Posts pro Sprache (26 de, 1 en)
├── content/impressum.md           # Statisches Impressum (wird von SPA geladen)
├── app/
│   ├── src/lib/i18n/              # svelte-i18n + activeLocale-Store + Messages
│   ├── src/lib/nostr/             # Relay-Loader (Listen, Replies, Reactions, Profile)
│   └── src/lib/components/        # u. a. LanguageSwitcher, Reactions, ReplyComposer
├── publish/                       # Deno-Publish-Pipeline (Blossom + Nostr)
├── snapshot/                      # Deno-Snapshot-Tool (Relays → JSON für Prerender)
├── preview/spa-mini/              # Vanilla-HTML-Mini-Spike (historisch)
├── scripts/
│   └── deploy-svelte.sh           # FTPS-Deploy, Targets: svelte/staging/prod
├── docs/
│   ├── STATUS.md                  # Dieses Dokument
│   ├── HANDOFF.md                 # Wie man hier weitermacht
│   ├── redaktion-bild-metadaten.md
│   ├── wiki-entwurf-nostr-bild-metadaten.md
│   ├── wiki-draft-nostr-image-metadata.md
│   ├── github-ci-setup.md
│   └── superpowers/
│       ├── specs/                 # SPA, Publish-Pipeline, Bild-Metadaten, Multilingual, Prerender, Docs-Cleanup
│       └── plans/
│           └── archive/           # Umgesetzte Pläne (Geschichte) + Prerender-Plan (durch 2026-04-28 ersetzt)
├── .github/workflows/             # publish.yml (Forgejo→GitHub Push-Mirror-Trigger)
├── .claude/
│   ├── skills/                    # Repo-spezifischer Claude-Skill
│   └── settings.local.json        # Claude-Session-State (gitignored)
├── CLAUDE.md                      # Einstiegspunkt für Claude-Sessions
└── .env.local                     # Gitignored: FTP-Creds, Bunker-URL, Publish-Pipeline-Keys
```

## Branch-Layout (Git)

- **`main`** — kanonischer Zweig, Produktions-Quelle seit Cutover.
- **`spa`** — historischer SvelteKit-Arbeitszweig, gemerged.
- **`hugo-archive`** — Orphan-Branch mit Hugo-Zustand, eingefroren.

## Setup-Zustand

Einmalig manuell erledigt (gitignored in `.env.local`):
- ✅ Amber-Bunker-URL als `BUNKER_URL`
- ✅ FTP-Creds für alle Targets (SVELTE/STAGING/PROD)
- ✅ `AUTHOR_PUBKEY_HEX` und `BOOTSTRAP_RELAY=wss://relay.primal.net`
- ✅ `CLIENT_SECRET_HEX` (identisch mit GitHub-Secret für stabile App-ID in Amber)
- ✅ `kind:10002`-Event publiziert (Relay-Liste)
- ✅ `kind:10063`-Event publiziert (Blossom-Server)
- ✅ Subdomains mit TLS + HSTS
- ✅ Staging → Webroot `joerglohrer26/`
- ✅ Prod → Webroot `joerglohrer26/` (Cutover 2026-04-18)
- ✅ NIP-05-JSON mit CORS-Header via `.htaccess`

## Offene Punkte (Details in HANDOFF.md)

Nach Priorität:
1. **Postfach `webmaster@joerg-lohrer.de`** als Weiterleitung in KAS anlegen.
2. **SPA respektiert NIP-09-Deletion-Events** (defensiver kind:5-Filter).
3. **Self-hosted CI** (Woodpecker / Cron auf Optiplex), weg von GitHub.
4. **5 UNKNOWN-Einträge** im VR-Post zur späteren Recherche.
5. **Weitere Übersetzungen** nach Bedarf — Framework ist sprach-agnostisch,
   neuer Sprach-Unterordner (z. B. `content/posts/fr/`) genügt, UI-i18n-
   Messages ergänzen.

## Erledigt (chronologisch seit 2026-04-15)

- ✅ **Prerender-Snapshot (2026-04-28)** — Post-Detailseiten werden zur
  Build-Zeit prerendered, nicht mehr live aus Relays. Sechs Etappen:
  - `renderMarkdown` auf `isomorphic-dompurify` (node-fähig).
  - Neues `snapshot/`-Modul (Deno) mit 32 Tests, liest Events von
    Relays und schreibt JSON-Artefakte (NIP-09-aware, Plausibilitäts-
    Checks, Cover-Probe, Cache mit akkumulierten deletedCoords).
  - GitHub-Action zieht Snapshot nach jedem Publish als Artifact.
  - SvelteKit-Detail-Route auf `prerender=true` mit `<svelte:head>` für
    OG/Twitter/JSON-LD/hreflang. `<html lang>` + `og:image:width/height`
    pro Post korrekt gesetzt; `x-default` zeigt auf DE-Slug.
  - Runtime-Relay-Fetch der Detail-Route entfernt.
  - Deploy-Skript ruft Snapshot vor SvelteKit-Build auf.
  - Toten Code aus Pre-Prerender-Ära entfernt (PostView, LanguageAvailability,
    loadPost, loadTranslations, translations.ts).
- ✅ Content-Migration: alle 18 Posts haben strukturierte `images:`-Liste
  im Frontmatter (91 Bilder, mit Alt-Text, Lizenz, Autor:innen, ggf.
  Caption und Modifications).
- ✅ Spec, Plan und Bild-Metadaten-Konvention geschrieben.
- ✅ Community-Wiki-Entwürfe (DE + EN) für Nostr-Bildattribution.
- ✅ **Publish-Pipeline komplett implementiert** (24 Tasks, 59 Tests grün).
- ✅ **Alle 18 Altposts publiziert** als `kind:30023`-Events.
- ✅ **91 Bilder** auf beiden Blossom-Servern.
- ✅ **GitHub-Actions-Workflow** + Forgejo→GitHub Push-Mirror + Secrets.
- ✅ **Duplikat-Event via NIP-09 gelöscht** (`bibel-selfies` Unix-Timestamp-dup).
- ✅ **Staging-Deploy-Infrastruktur** mit `__SITE_URL__`-Templating.
- ✅ **Homepage** mit Hero, Profilbild, Social-Icons (Nostr/Mastodon/
  Bluesky/LinkedIn/ORCID/Mail), Latest-Posts.
- ✅ **Archiv-Seite**, **Impressum-Seite**, Menü-Navigation im Layout.
- ✅ **CC0-Footer-Badge** (Heart+Zero inline SVG, monochrom).
- ✅ **Impressum auf CC0 umgestellt** (mit freundlichem Namensnennungs-Hinweis).
- ✅ **Cutover 2026-04-18** — `joerg-lohrer.de` von Hugo (`joerglohrer24/`)
  auf SvelteKit-SPA (`joerglohrer26/`) umgehängt.
- ✅ **Nostr-Reimport 2026-04-18** — 8 direkt-auf-Nostr erstellte Posts
  (Habla/Yakihonne) mit sauberen ASCII-slugs ins Repo geholt und neu
  publiziert, alte Events per NIP-09 gelöscht. 26 `kind:30023`-Events
  aktuell publiziert.
- ✅ **Delete-Subcommand** in der Pipeline (`deno task delete --event-id …`),
  nutzt stabile Bunker-Identität via `CLIENT_SECRET_HEX`.
- ✅ **NIP-32 Sprach-Tags** in `buildKind30023` (Default `de`, über
  `lang:`-Frontmatter überschreibbar).
- ✅ **Multilinguale Posts (2026-04-21)** — drei sequentielle Pläne
  (Pipeline, SPA-Resolving, UI-i18n) abgeschlossen:
  - Publish-Pipeline traversiert `content/posts/<lang>/<slug>/`, akzeptiert
    `a:`-Tags im Frontmatter und schreibt sie als NIP-33-Koordinaten mit
    Marker `translation` ins Event.
  - SPA löst `a`-Tags auf, zeigt kompakten Switcher im Post (`📖 DE | EN`),
    Klick setzt globalen Locale-State und navigiert zur Sprach-Variante.
  - UI-Chrome via `svelte-i18n`, `activeLocale`-Store mit `localStorage`-
    Persistenz, Listen-Seiten nach aktivem Locale gefiltert.
  - Erste englische Übersetzung `bible-selfies` existiert als lebendes
    Referenzbeispiel.
  - Zwei Publisher-Pipeline-Bugfixes (`contentRoot`-Pfad-Handling) und
    ein Route-Refresh-Bug (`onMount` → `$effect`) dabei nebenbei
    bereinigt — GitHub-Action re-publisht nun wirklich auf Content-Änderung.

## Live-Verifikation

```sh
curl -sI https://joerg-lohrer.de/ | head -3
curl -sI https://staging.joerg-lohrer.de/ | head -3
curl -s https://joerg-lohrer.de/.well-known/nostr.json | jq .
```

## Pipeline-Quick-Check

```sh
# Event-Count pro Relay
for r in wss://relay.damus.io wss://nos.lol wss://relay.primal.net wss://relay.tchncs.de wss://relay.edufeed.org; do
  echo -n "$r: "; nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 $r 2>/dev/null | wc -l
done
```

## Design-Referenzen

- `docs/superpowers/specs/2026-04-15-nostr-page-design.md` (SPA)
- `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md` (Publish, Blossom-only)
- `docs/superpowers/specs/2026-04-16-image-metadata-convention.md` (Bild-Metadaten-YAML)

Für die nächste Session: **`docs/HANDOFF.md`** lesen.
