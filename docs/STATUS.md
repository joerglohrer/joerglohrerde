# Projekt-Status: joerg-lohrer.de → Nostr-basierte SPA

**Stand:** 2026-04-18 (Cutover abgeschlossen)

## Kurzfassung

`joerg-lohrer.de` läuft als SvelteKit-SPA, die Blog-Posts live aus
signierten Nostr-Events (NIP-23, `kind:30023`) auf 5 Public-Relays rendert.
Bilder liegen content-addressed auf 2 Blossom-Servern. Die Hugo-basierte
Altseite ist als `hugo-archive`-Branch eingefroren.

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
- **Publizierte Events:** **26 Langform-Posts** (`kind:30023`), alle mit
  sauberen ASCII-slugs, alle aus dem Repo publiziert. 18 Alt-Posts aus der
  Hugo-Migration plus 8 re-importierte Client-Posts (Habla/Yakihonne), die
  mit bereinigten d-tags neu publiziert und alte Duplikate per NIP-09
  gelöscht wurden (Commit `7186c32`).
- **NIP-32-Sprach-Tags:** Alle Events tragen `['L', 'ISO-639-1']` +
  `['l', 'de', 'ISO-639-1']`. Grundlage für spätere Mehrsprachigkeit.
- **Relay-Liste** (`kind:10002`): `relay.damus.io`, `nos.lol`,
  `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`
- **Blossom-Server** (`kind:10063`): `blossom.edufeed.org`, `blossom.primal.net`
- **91 Bilder** auf beiden Blossom-Servern, alle Events enthalten
  hash-basierte Blossom-URLs.

## Repo-Struktur

```
joerglohrerde/
├── content/posts/             # 18 Markdown-Posts, alle mit strukturierten images:
├── content/impressum.md       # Statisches Impressum (wird von SPA geladen)
├── app/                       # SvelteKit-SPA (Laufzeit-Renderer)
├── publish/                   # Deno-Publish-Pipeline (Blossom + Nostr)
├── preview/spa-mini/          # Vanilla-HTML-Mini-Spike (historisch)
├── scripts/
│   └── deploy-svelte.sh       # FTPS-Deploy, Targets: svelte/staging/prod
├── docs/
│   ├── STATUS.md              # Dieses Dokument
│   ├── HANDOFF.md             # Wie man hier weitermacht
│   ├── redaktion-bild-metadaten.md
│   ├── wiki-entwurf-nostr-bild-metadaten.md
│   ├── wiki-draft-nostr-image-metadata.md
│   ├── github-ci-setup.md
│   └── superpowers/
│       ├── specs/             # SPA + Publish-Pipeline + Bild-Metadaten-Konvention
│       └── plans/
│           ├── 2026-04-15-spa-sveltekit.md       # erledigt
│           └── 2026-04-16-publish-pipeline.md    # erledigt
├── .github/workflows/         # publish.yml (Forgejo→GitHub Push-Mirror-Trigger)
├── .claude/
│   ├── skills/                # Repo-spezifischer Claude-Skill
│   └── settings.local.json    # Claude-Session-State (gitignored)
└── .env.local                 # Gitignored: FTP-Creds, Bunker-URL, Publish-Pipeline-Keys
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
3. **Mehrsprachigkeit** — parallele `lang:en`-Versionen bei Bedarf anlegen,
   per `a`-Tag als `translation_of` verlinken (NIP-32-Grundlage steht).
4. **Self-hosted CI** (Woodpecker / Cron auf Optiplex), weg von GitHub.
5. **5 UNKNOWN-Einträge** im VR-Post zur späteren Recherche.

## Erledigt (chronologisch seit 2026-04-15)

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
