# joerg-lohrer.de

Persönliche Webseite. In Transition von einer Hugo-basierten, statischen Seite
hin zu einer SvelteKit-SPA, die Blog-Posts live aus signierten Nostr-Events
(NIP-23, `kind:30023`) rendert.

## Aktueller Stand

- **`https://joerg-lohrer.de/`** — Hugo-Seite, läuft noch.
- **`https://spa.joerg-lohrer.de/`** — Vanilla-HTML-Mini-Spike (Proof of Concept).
- **`https://svelte.joerg-lohrer.de/`** — produktive SvelteKit-SPA (Ziel).

Detailliert in [`docs/STATUS.md`](docs/STATUS.md).

## Navigation

- 📍 **Stand und Live-URLs:** [`docs/STATUS.md`](docs/STATUS.md)
- 🔜 **Wie es weitergeht:** [`docs/HANDOFF.md`](docs/HANDOFF.md)
- 📐 **SPA-Spec:** [`docs/superpowers/specs/2026-04-15-nostr-page-design.md`](docs/superpowers/specs/2026-04-15-nostr-page-design.md)
- 📐 **Publish-Pipeline-Spec:** [`docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`](docs/superpowers/specs/2026-04-15-publish-pipeline-design.md)
- 🛠 **SvelteKit-SPA-Plan:** [`docs/superpowers/plans/2026-04-15-spa-sveltekit.md`](docs/superpowers/plans/2026-04-15-spa-sveltekit.md) (35 Tasks, abgeschlossen)
- 🤖 **Claude-Workflow-Skill:** [`.claude/skills/joerglohrerde-workflow.md`](.claude/skills/joerglohrerde-workflow.md)

## Branches

- **`main`** — kanonisch (Content, Specs, Pläne, Deploy-Scripts, Skill).
- **`spa`** — aktueller Arbeitszweig mit allen SvelteKit-Commits. Wird beim
  Cutover nach `main` gemerged.
- **`hugo-archive`** — eingefrorener Hugo-Zustand als Orphan-Branch.
  Rollback über `git checkout hugo-archive && hugo build`.

## Repo-Struktur

```
content/posts/                  Markdown-Posts (Quelle für Nostr-Events)
app/                            SvelteKit-SPA (Ziel-Implementation)
preview/spa-mini/               Vanilla-HTML-Mini-Spike (Referenz)
scripts/deploy-svelte.sh        FTPS-Deploy nach svelte.joerg-lohrer.de
static/                         Site-Assets (Favicons, Profilbild)
docs/                           Specs, Pläne, Status, Handoff
.claude/                        Claude-Code-Sessions (transparenz) + Skills
```

## Lizenz

Siehe [LICENSE](LICENSE).
