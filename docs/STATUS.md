# Projekt-Status: joerg-lohrer.de → Nostr-basierte SPA

**Stand:** 2026-04-15

## Kurzfassung

Jörg Lohrers persönliche Webseite wird von einem Hugo-basierten statischen
Site-Generator zu einer dezentralen Nostr-basierten SPA überführt. Posts
existieren als signierte Events (NIP-23, `kind:30023`) auf Public-Relays und
werden zur Laufzeit im Browser gerendert.

## Drei parallele Webseiten

| URL | Status | Rolle |
|---|---|---|
| `https://joerg-lohrer.de/` | live, unverändert | **Hugo-Altbestand** (wird noch nicht ersetzt) |
| `https://spa.joerg-lohrer.de/` | live | **Vanilla-HTML-Mini-Spike** (Proof of Concept, ~250 Zeilen HTML+JS) |
| `https://svelte.joerg-lohrer.de/` | live | **SvelteKit-SPA** (35-Task-Plan komplett) |

Die SvelteKit-SPA unter `svelte.joerg-lohrer.de` ist die Ziel-Implementierung.
`spa.joerg-lohrer.de` bleibt als schlanke Referenz erhalten. Hugo läuft weiter,
bis die Publish-Pipeline steht und der Cutover auf die Hauptdomain erfolgt.

## Was auf Nostr liegt

- **Autoren-Pubkey:** `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
  (hex: `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`)
- **Publizierte Events:** ~10 Langform-Posts (`kind:30023`), darunter
  `dezentrale-oep-oer`, `offenheit-das-wesentliche`, `gleichnis-vom-saemann`,
  `bibelfussball`, `dampfnudeln` u. a.
- **Relay-Liste** (`kind:10002`): `relay.damus.io`, `nos.lol`,
  `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`
- **Blossom-Server** (`kind:10063`): `blossom.edufeed.org`, `blossom.primal.net`

Bilder des ersten „experimentell publizierten" Posts (`dezentrale-oep-oer`)
liegen auf Blossom. Weitere 17 Altposts haben ihre Bilder noch unter dem
ursprünglichen Hugo-Permalink auf All-Inkl.

## Repo-Struktur

```
joerglohrerde/
├── content/posts/             # Markdown-Quelle (18 Posts, wird vom Publish-Skript gelesen)
├── app/                       # SvelteKit-SPA (Ziel-Implementation)
├── preview/spa-mini/          # Vanilla-HTML-Mini-Spike (Referenz)
├── scripts/
│   └── deploy-svelte.sh       # FTPS-Deploy nach svelte.joerg-lohrer.de
├── docs/
│   ├── STATUS.md              # Dieses Dokument
│   ├── HANDOFF.md             # Wie man hier weitermacht
│   └── superpowers/
│       ├── specs/             # SPA-Spec + Publish-Pipeline-Spec
│       └── plans/             # SPA-Implementation-Plan (35 Tasks, abgeschlossen)
├── .claude/
│   ├── skills/                # Repo-spezifischer Claude-Skill
│   └── settings.local.json    # Claude-Session-State (nicht committen? aktuell schon)
└── .env.local                 # Gitignored: FTP-Creds + Bunker-URL
```

## Branch-Layout (Git)

- **`main`** — kanonischer Zweig. Enthält Content, Specs, Pläne, Deploy-Scripts,
  `.claude/`-Skill. Schlanker als früher (kein Hugo-Artefakt mehr).
- **`spa`** — aktueller Arbeits-Branch. SvelteKit-SPA in `app/` komplett
  implementiert und live. **Aktuell vor `main` mit allen `spa:`-Commits.**
- **`hugo-archive`** — Orphan-Branch mit dem letzten funktionierenden
  Hugo-Zustand, eingefroren. Rollback über `git checkout hugo-archive && hugo build`.

## Setup-Zustand

Einmalig manuell erledigt:
- ✅ Amber-Bunker-URL in `.env.local` als `BUNKER_URL`
- ✅ SPA-FTP-Creds (`spa.joerg-lohrer.de`) in `.env.local` als `SPA_FTP_*`
- ✅ SvelteKit-FTP-Creds (`svelte.joerg-lohrer.de`) in `.env.local` als `SVELTE_FTP_*`
- ✅ `kind:10002`-Event publiziert
- ✅ `kind:10063`-Event publiziert
- ✅ Subdomains mit TLS + HSTS (`max-age=300`)

Alles in `.env.local` — gitignored, nicht committet.

## Offene Punkte / Nicht-in-Scope

- **Publish-Pipeline** (Spec vorhanden unter `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`, Plan noch nicht geschrieben)
- **Menü-Navigation** in der SPA (Home / Archiv / Impressum / Kontakt)
- **Impressum-Seite** (braucht rechtlichen Text)
- **Meta-Stubs für Social-Previews und SEO** (wird Teil der Publish-Pipeline)
- **SSH-Zugang zu All-Inkl** (laut Notiz von Jörg: Premium-Tarif im Kommen → rsync statt FTPS möglich)
- **Cutover auf `joerg-lohrer.de`** (Hauptdomain bekommt dann die SvelteKit-SPA)

## Live-Verifikation

Jederzeit:
```sh
curl -sI https://svelte.joerg-lohrer.de/ | head -3
curl -sI https://spa.joerg-lohrer.de/ | head -3
```

## Kontakt zur Implementierung

Alle Design-Entscheidungen in:
- `docs/superpowers/specs/2026-04-15-nostr-page-design.md` (SPA)
- `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md` (Publish)
- `docs/superpowers/plans/2026-04-15-spa-sveltekit.md` (35-Task-Plan, abgeschlossen)

Für die nächste Session: `docs/HANDOFF.md` lesen.
