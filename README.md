# joerg-lohrer.de

Persönliche Webseite. Befindet sich in der Transition von einer Hugo-basierten,
statischen Seite hin zu einer SvelteKit-SPA, die Blog-Posts live aus signierten
Nostr-Events (NIP-23, `kind:30023`) rendert.

## Branches

- **`main`** — aktuelle Arbeit. Enthält Markdown-Content (`content/posts/`),
  Specs (`docs/`), Assets (`static/`) und wird im Lauf der Migration um die
  SvelteKit-SPA und das Publish-Skript erweitert.
- **`spa`** — Feature-Branch für die SvelteKit-SPA-Entwicklung. Wird bei
  Cutover nach `main` gemerged.
- **`hugo-archive`** — eingefrorener Zustand der alten Hugo-Seite als
  Orphan-Branch (ein Commit ohne Historie). Nicht mehr weiterentwickelt.
  Wiederherstellbar über `git checkout hugo-archive && hugo build`.

## Spec

Architektur und Design-Entscheidungen:
[`docs/superpowers/specs/2026-04-15-nostr-page-design.md`](docs/superpowers/specs/2026-04-15-nostr-page-design.md)

## Struktur auf `main`

```
content/posts/      Markdown-Posts (Quelle für Nostr-Events)
static/             Site-Assets (Favicons, Profilbild)
docs/               Specs und Architektur-Dokumentation
.claude/            Claude-Code-Sessions (als Transparenz-Spur)
```

## Lizenz

Siehe [LICENSE](LICENSE).
