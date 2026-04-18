# joerg-lohrer.de

Persönliche Webseite. Nach einer Transition von einer Hugo-basierten,
statischen Seite läuft `joerg-lohrer.de` jetzt als SvelteKit-SPA, die
Blog-Posts live aus signierten Nostr-Events (NIP-23, `kind:30023`) rendert.

## Aktueller Stand

- **`https://joerg-lohrer.de/`** — SvelteKit-SPA, Cutover am 2026-04-18 erfolgt.
- **`https://staging.joerg-lohrer.de/`** — Staging (gleicher Build, ein Schritt vor Prod).
- **`https://svelte.joerg-lohrer.de/`** — Entwicklungs-Deploy-Target der Pipeline.
- **`https://spa.joerg-lohrer.de/`** — Vanilla-HTML-Mini-Spike (Proof of Concept, historisch).

Detailliert in [`docs/STATUS.md`](docs/STATUS.md).

## Wie die Seite funktioniert

1. **Inhalte** liegen als Markdown in `content/posts/<slug>/index.md` mit
   strukturierten Bild-Metadaten im Frontmatter (Alt-Text, Lizenz, Autor:innen).
2. **Publish-Pipeline** (`publish/`, Deno) lädt Bilder auf Blossom-Server
   (content-addressed) und publiziert signierte `kind:30023`-Events via
   NIP-46-Bunker (Amber) auf 5 Relays.
3. **SvelteKit-SPA** (`app/`) lädt diese Events zur Laufzeit und rendert
   Post-Liste + Detailseiten. Keine Server-Komponente, Static-Hosting reicht.
4. **CI**: GitHub Actions triggert die Publish-Pipeline bei Push auf `main`
   (via Forgejo→GitHub Push-Mirror).

Identität und Assets:
- **Pubkey:** `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
- **NIP-05:** `joerglohrer@joerg-lohrer.de` (statisches `.well-known/nostr.json`)
- **Blossom-Server:** `blossom.edufeed.org`, `blossom.primal.net`
- **Relays:** `relay.damus.io`, `nos.lol`, `relay.primal.net`, `relay.tchncs.de`, `relay.edufeed.org`

## Navigation

- 📍 **Stand und Live-URLs:** [`docs/STATUS.md`](docs/STATUS.md)
- 🔜 **Wie es weitergeht:** [`docs/HANDOFF.md`](docs/HANDOFF.md)
- 📐 **SPA-Spec:** [`docs/superpowers/specs/2026-04-15-nostr-page-design.md`](docs/superpowers/specs/2026-04-15-nostr-page-design.md)
- 📐 **Publish-Pipeline-Spec:** [`docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`](docs/superpowers/specs/2026-04-15-publish-pipeline-design.md)
- 📐 **Bild-Metadaten-Konvention:** [`docs/superpowers/specs/2026-04-16-image-metadata-convention.md`](docs/superpowers/specs/2026-04-16-image-metadata-convention.md)
- 🛠 **SvelteKit-SPA-Plan:** [`docs/superpowers/plans/2026-04-15-spa-sveltekit.md`](docs/superpowers/plans/2026-04-15-spa-sveltekit.md) (35 Tasks, abgeschlossen)
- 🛠 **Publish-Pipeline-Plan:** [`docs/superpowers/plans/2026-04-16-publish-pipeline.md`](docs/superpowers/plans/2026-04-16-publish-pipeline.md) (24 Tasks, abgeschlossen)
- 🤖 **Claude-Workflow-Skill:** [`.claude/skills/joerglohrerde-workflow.md`](.claude/skills/joerglohrerde-workflow.md)

## Branches

- **`main`** — kanonisch. Seit Cutover (2026-04-18) Produktions-Quelle.
- **`spa`** — historischer SvelteKit-Arbeitszweig, inzwischen gemerged.
- **`hugo-archive`** — eingefrorener Hugo-Zustand als Orphan-Branch.
  Rollback-Option über `git checkout hugo-archive && hugo build`.

## Repo-Struktur

```
content/posts/                  Markdown-Posts (Quelle für Nostr-Events, 18 Stück)
content/impressum.md            Statisches Impressum (wird von SPA geladen)
app/                            SvelteKit-SPA (Laufzeit-Renderer)
publish/                        Deno-Publish-Pipeline (Blossom + Nostr)
preview/spa-mini/               Vanilla-HTML-Mini-Spike (historische Referenz)
scripts/deploy-svelte.sh        FTPS-Deploy, Targets: svelte/staging/prod
static/                         Site-Assets (Favicons, Profilbild, .well-known/)
docs/                           Specs, Pläne, Status, Handoff, Wiki-Entwürfe
.github/workflows/              GitHub-Actions CI (Publish-Pipeline-Trigger)
.claude/                        Claude-Code-Sessions (Transparenz) + Skills
```

## Entwicklung

```sh
# SPA lokal
cd app && npm run dev

# SPA testen
cd app && npm run test:unit
cd app && npm run test:e2e
cd app && npm run check

# Publish-Pipeline
cd publish && deno task check                    # pre-flight
cd publish && deno task publish --dry-run        # Simulation
cd publish && deno task publish                  # diff-modus echt
cd publish && deno task publish --post <slug>    # ein Post
cd publish && deno task test                     # Tests

# Deploy
DEPLOY_TARGET=staging ./scripts/deploy-svelte.sh
DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh
```

## Lizenz

Inhalte: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/deed.de)
(Namensnennung erwünscht, aber rechtlich nicht erforderlich), sofern nicht
anders vermerkt. Drittinhalte sind beim jeweiligen Bild mit Autor:innen und
Lizenz gekennzeichnet.

Code: siehe [LICENSE](LICENSE).
