# Projekt-Status: joerg-lohrer.de → Nostr-basierte SPA

**Stand:** 2026-04-18

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
- **Publizierte Events:** **18 Langform-Posts** (`kind:30023`) — alle Altposts
  via Publish-Pipeline migriert (Commit `0c6fdd1`, Log in
  `docs/publish-logs/2026-04-18-force-all-migration.json`).
- **Relay-Liste** (`kind:10002`): `relay.damus.io`, `nos.lol`,
  `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`
- **Blossom-Server** (`kind:10063`): `blossom.edufeed.org`, `blossom.primal.net`

**91 Bilder** auf beiden Blossom-Servern. Alle Events enthalten hash-basierte
Blossom-URLs. SPA rendert alle Posts einheitlich — kein Legacy-Pfad, keine
rsync-Artefakte.

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

- **End-to-End-Test CI mit echtem Content-Push** (Workflow-Manual-Trigger
  ist grün; automatischer Auto-Trigger via Push-Mirror noch nicht real
  ausprobiert).
- **Menü-Navigation** in der SPA (Home / Archiv / Impressum / Kontakt)
- **Impressum-Seite** (braucht rechtlichen Text)
- **Cutover auf `joerg-lohrer.de`** (Pipeline läuft, Voraussetzung erfüllt;
  Hauptdomain kann auf SvelteKit-SPA umgestellt werden)
- **5 UNKNOWN-Einträge** im `virtual-reality`-Post zur späteren Recherche
  (Wikipedia-Screenshot, Sketchfab-Fotograf, Ready-Player-Me, EyeMeasure-App)
- **CI-Migration** (später): weg von GitHub-Actions zu Woodpecker oder
  Cron auf Optiplex — siehe `docs/github-ci-setup.md`.

## Erledigt seit 2026-04-15

- ✅ Content-Migration: alle 18 Posts haben strukturierte `images:`-Liste
  im Frontmatter (91 Bilder, mit Alt-Text, Lizenz, Autor:innen, ggf. Caption
  und Modifications). Commit `c023b59`.
- ✅ Erlebnispädagogik-Post: tote Amazon-Hotlinks entfernt.
- ✅ Spec, Plan und Bild-Metadaten-Konvention geschrieben.
- ✅ Community-Wiki-Entwürfe (DE + EN) für Nostr-Bildattribution.
- ✅ **Publish-Pipeline komplett implementiert**, 22 Tasks aus dem Plan:
  - 18 Code-Tasks (Phase 1–6), 59 Unit-Tests grün
  - Stabile NIP-46-Anbindung via `CLIENT_SECRET_HEX` für wiederverwendbare
    App-Identität in Amber
  - `validatePost` akzeptiert auch string-dates (für Hugo-Kompatibilität)
- ✅ **Alle 18 Altposts publiziert** als `kind:30023`-Events (Commit `0c6fdd1`,
  Log in `docs/publish-logs/2026-04-18-force-all-migration.json`).
- ✅ **91 Bilder** auf beiden Blossom-Servern.
- ✅ SPA rendert alle Posts mit Bildern von Blossom (visuell verifiziert).
- ✅ **GitHub-Actions-Workflow** angelegt (`.github/workflows/publish.yml`).
- ✅ Forgejo → GitHub Push-Mirror eingerichtet, GitHub-Secrets gesetzt.
- ✅ **`spa` → `main` gemergt**, GitHub-Actions-Workflow manuell verifiziert
  (Run #1: signer ok, outbox ok, blossom-liste ok, mode=diff posts=0).
  **Alle 24 Tasks des Publish-Pipeline-Plans abgeschlossen.**
- ✅ **Staging-Deploy-Infrastruktur:** `scripts/deploy-svelte.sh` mit
  drei Targets (`svelte`/`staging`/`prod`), dynamisches `og:url` und
  `canonical` via `__SITE_URL__`-Platzhalter. Staging-Subdomain
  `staging.joerg-lohrer.de` bedient jetzt `joerglohrer26/` (Cutover-Ziel).
- ✅ **Duplikat-Event `1744905463975` via NIP-09 gelöscht** (Delete-Event
  `7f5d08b8…`, auf alle 5 Relays). Nach Migration nicht mehr auffindbar.

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
