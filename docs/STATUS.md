# Projekt-Status: joerg-lohrer.de → Nostr-basierte SPA

**Stand:** 2026-04-16

## Kurzfassung

Jörg Lohrers persönliche Webseite wird von einem Hugo-basierten statischen
Site-Generator zu einer dezentralen Nostr-basierten SPA überführt. Posts
existieren als signierte Events (NIP-23, `kind:30023`) auf Public-Relays und
werden zur Laufzeit im Browser gerendert.

## Vier parallele Webseiten

| URL | Status | Rolle |
|---|---|---|
| `https://joerg-lohrer.de/` | live, unverändert | **Hugo-Altbestand** (bleibt bis Cutover) |
| `https://spa.joerg-lohrer.de/` | live | **Vanilla-HTML-Mini-Spike** (Proof of Concept) |
| `https://svelte.joerg-lohrer.de/` | live | **SvelteKit-SPA** (35-Task-Plan komplett) |
| `https://staging.joerg-lohrer.de/` | live, leer | **Staging** (Webroot `joerglohrer26/` für Pipeline-Entwicklung; FTP-Creds in `.env.local`) |

Die SvelteKit-SPA unter `svelte.joerg-lohrer.de` ist die Ziel-Implementierung.
`spa.joerg-lohrer.de` bleibt als schlanke Referenz erhalten. Hugo läuft weiter,
bis die Publish-Pipeline steht und der Cutover auf die Hauptdomain erfolgt.

## Was auf Nostr liegt

- **Autoren-Pubkey:** `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
  (hex: `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`)
- **Publizierte Events:** ~10 Langform-Posts (`kind:30023`). Die restlichen
  8 Posts warten auf die Publish-Pipeline (Events werden beim ersten
  `deno task publish --force-all`-Lauf erzeugt).
- **Relay-Liste** (`kind:10002`): `relay.damus.io`, `nos.lol`,
  `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`
- **Blossom-Server** (`kind:10063`): `blossom.edufeed.org`, `blossom.primal.net`

Bisher nur die Bilder des `dezentrale-oep-oer`-Posts auf Blossom. **Designentscheidung
2026-04-16:** Alle Bilder (inkl. der 17 Altpost-Bilder) kommen via Publish-Pipeline
auf Blossom — kein rsync-Legacy-Pfad mehr, kein `image_source: legacy`-Flag.
Einheitlicher Render-Pfad in der SPA.

## Repo-Struktur

```
joerglohrerde/
├── content/posts/             # 18 Markdown-Posts, alle mit structured images: im Frontmatter
├── app/                       # SvelteKit-SPA (Ziel-Implementation)
├── preview/spa-mini/          # Vanilla-HTML-Mini-Spike (Referenz)
├── publish/                   # NOCH NICHT ANGELEGT — Publish-Pipeline (Task 1 aus Plan)
├── scripts/
│   └── deploy-svelte.sh       # FTPS-Deploy nach svelte.joerg-lohrer.de
├── docs/
│   ├── STATUS.md              # Dieses Dokument
│   ├── HANDOFF.md             # Wie man hier weitermacht
│   ├── redaktion-bild-metadaten.md           # Checkliste, Bild-Durchgang (abgearbeitet)
│   ├── wiki-entwurf-nostr-bild-metadaten.md  # Wiki-Konvention deutsch
│   ├── wiki-draft-nostr-image-metadata.md    # Wiki-Konvention englisch
│   └── superpowers/
│       ├── specs/             # SPA + Publish-Pipeline + Bild-Metadaten-Konvention
│       └── plans/
│           ├── 2026-04-15-spa-sveltekit.md             # erledigt
│           └── 2026-04-16-publish-pipeline.md          # ⬅ als nächstes
├── .claude/
│   ├── skills/                # Repo-spezifischer Claude-Skill
│   └── settings.local.json    # Claude-Session-State (gitignored)
└── .env.local                 # Gitignored: FTP-Creds, Bunker-URL, Publish-Pipeline-Keys
```

## Branch-Layout (Git)

- **`main`** — kanonischer Zweig.
- **`spa`** — aktueller Arbeits-Branch, vor `main`. SvelteKit-SPA live,
  Content-Migration (Bild-Metadaten) abgeschlossen, Publish-Pipeline geplant.
- **`hugo-archive`** — Orphan-Branch mit Hugo-Zustand, eingefroren.

## Setup-Zustand

Einmalig manuell erledigt:
- ✅ Amber-Bunker-URL in `.env.local` als `BUNKER_URL`
- ✅ FTP-Creds für alle Subdomains (SPA, SVELTE, STAGING) in `.env.local`
- ✅ `AUTHOR_PUBKEY_HEX` und `BOOTSTRAP_RELAY=wss://relay.primal.net` in `.env.local`
- ✅ `kind:10002`-Event publiziert (Relay-Liste)
- ✅ `kind:10063`-Event publiziert (Blossom-Server)
- ✅ Subdomains mit TLS + HSTS
- ✅ Staging-Subdomain `staging.joerg-lohrer.de` → Webroot `joerglohrer26/`

Alles in `.env.local` — gitignored, nicht committet.

## Offene Punkte

- **Publish-Pipeline** — Spec + Plan vollständig, **Implementierung steht an**
  (Task 1 aus `docs/superpowers/plans/2026-04-16-publish-pipeline.md`).
- **Menü-Navigation** in der SPA (Home / Archiv / Impressum / Kontakt)
- **Impressum-Seite** (braucht rechtlichen Text)
- **Cutover auf `joerg-lohrer.de`** (nach Pipeline-Live: Hauptdomain
  bekommt die SvelteKit-SPA)

## Erledigt seit 2026-04-15

- ✅ Content-Migration: alle 18 Posts haben strukturierte `images:`-Liste
  im Frontmatter (91 Bilder, mit Alt-Text, Lizenz, Autor:innen, ggf. Caption
  und Modifications). Commit `c023b59`.
- ✅ Erlebnispädagogik-Post: tote Amazon-Hotlinks entfernt, Literatur-
  Liste aufgeräumt.
- ✅ Design-Entscheidung „Blossom-only" dokumentiert in Spec
  `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`.
- ✅ Publish-Pipeline-Plan (24 Tasks, Blaupausen-tauglich) geschrieben:
  `docs/superpowers/plans/2026-04-16-publish-pipeline.md`.
- ✅ Bild-Metadaten-Konvention (Phase 1) in Spec:
  `docs/superpowers/specs/2026-04-16-image-metadata-convention.md`.
- ✅ Community-Wiki-Entwürfe (DE + EN) für Nostr-Bildattribution:
  `docs/wiki-entwurf-nostr-bild-metadaten.md` + `-draft-nostr-image-metadata.md`.
- ✅ 5 `UNKNOWN`-Einträge im VR-Post zur Recherche markiert (bleiben erstmal so).

## Live-Verifikation

```sh
curl -sI https://svelte.joerg-lohrer.de/ | head -3
curl -sI https://staging.joerg-lohrer.de/ | head -3
```

## Kontakt zur Implementierung

Alle Design-Entscheidungen in:
- `docs/superpowers/specs/2026-04-15-nostr-page-design.md` (SPA)
- `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md` (Publish, Blossom-only)
- `docs/superpowers/specs/2026-04-16-image-metadata-convention.md` (Bild-Metadaten-YAML)
- `docs/superpowers/plans/2026-04-16-publish-pipeline.md` (24 Tasks, als nächstes)

Für die nächste Session: **`docs/HANDOFF.md`** lesen.
