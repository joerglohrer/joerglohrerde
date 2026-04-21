---
name: joerglohrerde-workflow
description: Repo-spezifischer Skill für joerglohrerde. Nutze ihn bei jedem Session-Start, um den aktuellen Zustand zu erfassen, Konventionen zu verstehen und wiederkehrende Workflows (Deploy, Publish, Tests, Multilingual) effizient auszuführen.
---

# joerglohrerde — Session-Skill

Dieses Repo ist die persönliche Webseite von Jörg Lohrer: eine dezentrale
Nostr-basierte SvelteKit-SPA, die NIP-23-Langform-Events live von Public-
Relays rendert. Seit 2026-04-21 mehrsprachig (DE/EN) via `svelte-i18n` +
NIP-33-`a`-Tags.

## Beim Session-Start IMMER zuerst

1. **Lies `CLAUDE.md`** — Agent-spezifische Konventionen (Commit-Stil,
   Deploy-Falle, Globbing-Hinweise).
2. **Lies `docs/STATUS.md`** — aktueller Projektstand, Live-URLs.
3. **Lies `docs/HANDOFF.md`** — nächste Schritte, Stolperfallen,
   Alltags-Workflow für neue Posts + Übersetzungen.
4. Bei konkreten Aufgaben: zugehörige Spec unter `docs/superpowers/specs/`
   oder Plan unter `docs/superpowers/plans/`.
5. Branch-Check: `git log --oneline -10 main`.

Dann erst Rückfragen oder Vorschläge formulieren.

## Live-URLs

| URL | Rolle |
|---|---|
| `joerg-lohrer.de` | **Produktion**, SvelteKit-SPA (Cutover 2026-04-18, multilingual seit 2026-04-21) |
| `staging.joerg-lohrer.de` | Pre-Prod-Build |
| `svelte.joerg-lohrer.de` | Entwicklungs-Deploy-Target (historischer Default) |
| `spa.joerg-lohrer.de` | Vanilla-HTML-Spike (historisch) |

**Wichtig:** `scripts/deploy-svelte.sh` hat `DEPLOY_TARGET=svelte` als
Default — das zielt auf `svelte.joerg-lohrer.de`, NICHT auf die
Produktion. Für Prod-Deploy IMMER `DEPLOY_TARGET=prod` explizit setzen.

## Git-Branches

- `main` — kanonisch, alle Arbeit läuft hier direkt.
- `hugo-archive` — Orphan, eingefrorener Hugo-Zustand (Rollback-Option).

`spa` aus der Pre-Cutover-Phase ist gemerged und historisch.

## Sprache und Ton

- Antworten und Commit-Messages auf **Deutsch** (Kundensprache).
- Code-Identifier (Variablen, Funktionen, Typen) auf Englisch.
- Kurz und konkret — Jörg ist technisch versiert, erwartet keine
  Grundlagen-Erklärungen.
- Commit-Präfixe: `feat`, `fix`, `chore`, `docs`, `test` (conventional).
- Co-Author: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

## Kernkonventionen

### Content-Struktur

- Markdown-Posts pro Sprache: `content/posts/<lang>/<slug>/index.md`.
- Slug ist global eindeutig (also NICHT identisch zwischen Sprach-Varianten).
  Der Slug wird zum `d`-Tag des Events und zur URL (`/<slug>/`).
- Sprach-Differenzierung über `l`-Tag (NIP-32), nicht über den Slug.
- Bidirektionale Verlinkung zwischen Sprach-Varianten via `a:`-Frontmatter,
  wird als `['a', '<coord>', '', 'translation']` ins Event geschrieben.

### URL-Schema

- Post-URL: `/<slug>/` (z. B. `/bibel-selfies/`, `/bible-selfies/`). Keine
  Sprach-Präfixe in der URL.
- Legacy-Hugo-URLs `/YYYY/MM/DD/<dtag>.html/` werden 301-redirected.
- Tag-Route: `/tag/<name>/`.

### Nostr-Konstanten

- Pubkey (hex): `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`
- npub: `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
- Bootstrap-Relay: `wss://relay.damus.io`
- Relay-Liste: aus `kind:10002` des Autors (zur Laufzeit geladen).
- Blossom-Server: aus `kind:10063` des Autors.
- Zentralisiert in `app/src/lib/nostr/config.ts` bzw. `.env.local`.

### Signing

- **Im Browser (Kommentare):** NIP-07 via Extension (Alby, nos2x).
- **Aus der Kommandozeile (Publish):** NIP-46 via Amber-Bunker.
- Privater Schlüssel **nie** im Repo, nie in CI-Secrets direkt.

## Wiederkehrende Kommandos

### SPA-Entwicklung

```sh
cd app
npm run dev                # Dev-Server localhost:5173
npm run check              # Type-Check (svelte-check)
npm run test:unit          # Vitest
npm run test:e2e           # Playwright
npm run build              # Prod-Build nach app/build/
```

### Publish-Pipeline

```sh
cd publish
deno task check                                  # pre-flight (Bunker, Relays, Blossom)
deno task publish --dry-run                      # diff-modus simulation
deno task publish                                # diff-modus real
deno task publish --force-all                    # alle 27 Posts
deno task publish --post <slug>                  # einzelner Post
deno task delete --event-id <hex> --reason "…"   # NIP-09-Löschung
deno task validate-post ../content/posts/<lang>/<dir>/index.md
deno task test                                   # Tests (73)
```

### Deploy

```sh
DEPLOY_TARGET=staging ./scripts/deploy-svelte.sh   # Pre-Prod
DEPLOY_TARGET=prod    ./scripts/deploy-svelte.sh   # Prod (joerg-lohrer.de)
```

### Nostr-Status checken

```sh
# Alle publizierten kind:30023-Events des Autors (inkl. l-Tag + a-Tags)
nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -c '{d: (.tags[] | select(.[0]=="d") | .[1]), l: (.tags[] | select(.[0]=="l") | .[1]), title: (.tags[] | select(.[0]=="title") | .[1])}'
```

## Tech-Stack-Eigenheiten, die man kennen muss

1. **Svelte 5 Runes:** `$props()`-Werte via `$derived()` in lokale Variablen.
   `$effect(() => { … event.id })` statt `onMount`, wenn bei Prop-Änderung
   neu geladen werden muss (siehe `[...slug]/+page.svelte`).

2. **applesauce-relay v5.x API:** RxJS-basiert. `pool.request(relays, filter)`
   liefert `Observable<NostrEvent>`. Die Loader in `app/src/lib/nostr/loaders.ts`
   nutzen `toArray() + lastValueFrom + timeout + catchError`-Pattern.

3. **DOMPurify braucht DOM:** Early-Fail-Guard für Node-Aufrufe im
   `renderMarkdown`-Helper. SSR ist ohnehin aus (`ssr = false` im Layout).

4. **All-Inkl-FTPS-Bug:** Data-Connection bricht bei TLS 1.3 ab.
   `--tls-max 1.2` im curl-Call. Sobald SSH auf All-Inkl verfügbar ist
   (Premium-Tarif angefragt), Umstellung auf rsync möglich.

5. **Amber-Bunker-Session:** bei neuer Bunker-URL müssen globale
   Permissions in Amber auf „Allow + Always" für `get_public_key` und
   `sign_event` gesetzt werden.

6. **Forgejo→GitHub Push-Mirror:** `git push` geht nach Forgejo, die
   Action läuft auf GitHub (nachdem Forgejo gespiegelt hat). Push → Mirror →
   Action braucht typisch 1–2 Minuten.

7. **svelte-i18n + activeLocale:** `$t('key')` in Templates, `get(t)('key')`
   in imperativem Script-Code. `activeLocale` ist der projekteigene Store
   (persistiert via `localStorage`), `locale` aus svelte-i18n wird
   automatisch synchronisiert.

8. **zsh-Globbing:** Pfade mit eckigen Klammern (z. B. `app/src/routes/[...slug]/`)
   müssen in `git add` in einfachen Anführungszeichen stehen, sonst
   interpretiert zsh das als Glob-Pattern.

## Wie mit Jörg arbeiten

- **Kurze Antworten**, konkrete Optionen, keine Grundlagen-Erklärungen.
- Bei mehreren Wegen: 2–3 Varianten mit Empfehlung nennen, nicht alles
  aufzählen.
- Spec-Updates auf `main` committen, dort läuft alle Arbeit.
- Nach Feature-Commits: Build + Deploy, damit Jörg live sehen kann.
  UI-Feedback fängt Layout-Fragen ab, die Tests nicht entdecken.
- Vor Subagent-Dispatch: kritische API-Details verifizieren
  (Plan-Annahmen können veraltet sein).

## Credentials / Secrets

Alle in `.env.local` (gitignored):
- `BUNKER_URL` — Amber-NIP-46-Pairing für Signaturen
- `CLIENT_SECRET_HEX` — identisch mit GitHub-Secret (stabile App-ID in Amber)
- `AUTHOR_PUBKEY_HEX`, `BOOTSTRAP_RELAY`
- `SVELTE_FTP_*`, `STAGING_FTP_*` — FTPS-Credentials pro Deploy-Target

Falls neue Bunker-URL nötig (Amber-Session kaputt):
- In Amber neue Bunker-URL generieren
- In `.env.local` ersetzen
- In Amber globale Permissions für die App löschen, sonst hängt der Request
