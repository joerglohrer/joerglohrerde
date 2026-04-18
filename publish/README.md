# publish — Nostr-Publish-Pipeline

Markdown-Posts aus einem Hugo-ähnlichen Content-Ordner zu `kind:30023`-Events,
Bilder zu Blossom, Signatur via NIP-46-Bunker.

Blaupause für Nostr-Repos: keinerlei Projekt-Konstanten im Code, alles über
Env-Variablen konfigurierbar.

## Setup

1. `cp .env.example .env` und Werte eintragen.
2. Oder: `.env.local` im Eltern-Ordner pflegen und `deno.jsonc` anpassen
   (siehe `--env-file=../.env.local`-Tasks).
3. `deno task check` — verifiziert Bunker, Relay-Liste, Blossom-Server.

## Befehle

- `deno task publish` — Git-Diff-Modus: publisht nur geänderte Posts.
- `deno task publish --force-all` — alle Posts (Migration / Reimport).
- `deno task publish --post <slug>` — nur ein Post.
- `deno task publish --dry-run` — zeigt, was publiziert würde, ohne Uploads.
- `deno task validate-post content/posts/<ordner>/index.md` — Frontmatter-Check.
- `deno task test` — Tests.

## Struktur

- `src/core/` — Library (Frontmatter, Markdown, Events, Signer, Relays, Blossom).
- `src/subcommands/` — CLI-Befehle.
- `src/cli.ts` — Entrypoint, Subcommand-Dispatcher.
- `tests/` — Unit- und Integration-Tests.
- `.github/workflows/publish.yml` — CI-Workflow.
