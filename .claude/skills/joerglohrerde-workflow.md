---
name: joerglohrerde-workflow
description: Repo-spezifischer Skill für joerglohrerde. Nutze ihn bei jedem Session-Start, um den aktuellen Zustand zu erfassen, Konventionen zu verstehen und wiederkehrende Workflows (Deploy, Publish, Tests) effizient auszuführen.
---

# joerglohrerde — Session-Skill

Dieses Repo ist die persönliche Webseite von Jörg Lohrer — in Transition
von Hugo zu einer dezentralen Nostr-basierten SvelteKit-SPA.

## Beim Session-Start IMMER zuerst

1. **Lies `docs/STATUS.md`** — aktueller Projektstand, live-URLs, Branches.
2. **Lies `docs/HANDOFF.md`** — was wartet, nächste Schritte, Stolperfallen.
3. Bei konkreten Aufgaben: entsprechende Spec unter `docs/superpowers/specs/`
   oder Plan unter `docs/superpowers/plans/`.
4. Branch-Zustand prüfen: `git log --oneline -10 spa main hugo-archive`.

Dann erst Rückfragen oder Vorschläge formulieren.

## Drei Live-Webseiten

| URL | Inhalt | Wann anfassen |
|---|---|---|
| `joerg-lohrer.de` | Hugo-Seite (alt) | nur im finalen Cutover |
| `spa.joerg-lohrer.de` | Vanilla-Mini-Spike | als Referenz, aber nicht weiterentwickeln |
| `svelte.joerg-lohrer.de` | SvelteKit-SPA | **Haupt-Arbeitsziel** |

## Git-Branches

- `main` — kanonisch (Content, Specs, Pläne, Deploy-Scripts)
- `spa` — aktueller Arbeitszweig mit allen SvelteKit-Commits
- `hugo-archive` — Orphan, eingefrorener Hugo-Zustand

Specs und Pläne gehören auf `main`; SvelteKit-Code auf `spa`. Typischer
Workflow: committe Spec-Updates auf `main`, merge `main` → `spa` um
sie überall zu haben.

## Sprache und Ton

- Antworten und Commit-Messages auf **Deutsch** (Kundensprache).
- Code-Kommentare auch auf Deutsch (wenn überhaupt).
- Identifier, Variablen, Funktionen auf **Englisch**.
- Kurz und konkret — Jörg ist technisch versiert, erwartet keine
  Grundlagen-Erklärungen.

## Kernkonventionen

### Kanonisches URL-Schema

- Post-URL ist **kurz**: `/<dtag>/` (z. B. `/dezentrale-oep-oer/`).
- Legacy-Hugo-URLs `/YYYY/MM/DD/<dtag>.html/` werden per SvelteKit-Load
  auf die kurze Form 301-redirected (Backlink-Kompatibilität).
- Tag-Route: `/tag/<name>/`.

### Slug-Regel

Alle Slugs sind lowercase (Frontmatter `slug:`). Commit `d17410f` hat das
normalisiert. Keine Runtime-Transformation, beim Publishen 1:1 übernehmen.

### Nostr-Konstanten

- Pubkey (hex): `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41`
- npub: `npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9`
- Bootstrap-Relay: `wss://relay.damus.io`
- Vollständige Relay-Liste: aus `kind:10002` des Autors (on-the-fly).
- Blossom-Server: aus `kind:10063` des Autors.

Zentralisiert in `app/src/lib/nostr/config.ts`.

### Signing

- **Im Browser (Kommentare):** NIP-07 via Extension (Alby, nos2x).
- **Aus der Kommandozeile (Publish):** NIP-46 via Amber-Bunker. Bunker-URL
  in `.env.local` als `BUNKER_URL`.
- Privater Schlüssel **nie** im Repo, nie in CI-Secrets, nie in einer
  Pipeline-Umgebung direkt.

## Wiederkehrende Kommandos

### SPA-Entwicklung

```sh
cd app
npm run dev                # Dev-Server localhost:5173
npm run check              # Type-Check (sollte 0 errors sein)
npm run test:unit          # Vitest — aktuell 29 Tests
npm run test:e2e           # Playwright — aktuell 3 Tests
npm run build              # Prod-Build nach app/build/
```

### Deploy nach `svelte.joerg-lohrer.de`

```sh
cd app && npm run build && cd ..
./scripts/deploy-svelte.sh
```

Das Script:
- liest `SVELTE_FTP_*` aus `.env.local`
- uploaded `app/build/*` per FTPS (TLS 1.2-Cap wegen All-Inkl-Bug)
- checkt `HTTP/2 200` am Ende

### Manuelles Publishen eines Posts (bis Publish-Pipeline fertig ist)

Siehe `docs/HANDOFF.md` Abschnitt „Manuelles Publishen". Kurz:
- Body aus Markdown-Frontmatter extrahieren (awk-Pattern dort)
- Bilder zu Blossom: `nak blossom upload --server https://blossom.edufeed.org --sec "$BUNKER_URL" <bild>`
- Event bauen mit `nak event -k 30023 -d <slug> -t title=... ...`
- Push zu allen Relays

### Nostr-Status checken

```sh
# Alle publizierten kind:30023-Events des Autors
nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -c '{d: (.tags[] | select(.[0]=="d") | .[1]), title: (.tags[] | select(.[0]=="title") | .[1])}'

# kind:10002 (Relay-Liste)
nak req -k 10002 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io

# kind:10063 (Blossom-Liste)
nak req -k 10063 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io
```

## Tech-Stack-Eigenheiten, die man kennen muss

1. **Svelte 5 Runes:** `$props()`-Werte müssen via `$derived()` in lokale
   Variablen abgeleitet werden — sonst `state_referenced_locally`-Warning.

2. **applesauce-relay v5.x API:** RxJS-basiert. `pool.request(relays, filter)`
   liefert `Observable<NostrEvent>`. Die Loader in `app/src/lib/nostr/loaders.ts`
   nutzen `toArray() + lastValueFrom + timeout + catchError`-Pattern.
   **Nicht** das Tupel-Pattern `msg[0] === 'EVENT'` — das gehört in
   alte nostr-tools-Beispiele, nicht hierher.

3. **DOMPurify braucht DOM:** im `renderMarkdown`-Helper gibt es einen
   Early-Fail-Guard für Node-Aufrufe (SSR ist ohnehin aus).

4. **All-Inkl-FTPS-Bug:** Data-Connection bricht bei TLS 1.3 ab.
   `--tls-max 1.2` im curl-Call. Sobald SSH auf All-Inkl verfügbar ist
   (Premium-Tarif angefragt), wird das Deploy-Script auf rsync umgestellt.

5. **Amber-Bunker-Session:** bei neuer Bunker-URL müssen globale
   Permissions in Amber zurückgesetzt werden. Sonst hängt `nak event`
   auf die Signatur-Response.

## Was nicht in Scope ist (laut Plan/Specs)

- Impressum-Inhalt (rechtliche Texte)
- Meta-Stubs pro Post (kommt via Publish-Pipeline Phase 3)
- Menü-Navigation (einfach nachrüstbar, aber nicht priorisiert)
- Eigener Relay (ideologischer Evolutionspfad, nicht Phase 1)
- Eigener Blossom-Server (dito)

## Wie mit Jörg arbeiten

- **Kurze Antworten**, konkrete Optionen, nicht lang umherreden.
- Bei mehreren Wegen: 2–3 Varianten mit Empfehlung nennen, nicht alles
  aufzählen.
- Commit-Nachrichten: imperativ, auf Deutsch, mit Kontext im Body.
  Co-Author: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`.
- Vor dem Dispatchen von Subagents: kritische API-Details der Libraries
  manuell verifizieren (Plan-Annahmen können alte Versionsstände
  widerspiegeln). Beispiel: applesauce-relay API war nicht so wie im Plan
  beschrieben — Subagent mit aktueller API briefen statt blind vertrauen.
- Nach jedem Feature-Commit: Build + Deploy, damit Jörg live sehen kann.
  Das ist in diesem Workflow wichtig, weil UI-Feedback oft Layout-Fragen
  aufwirft, die kein Test entdeckt.

## Credentials / Secrets

Alle in `.env.local` (gitignored). Variablen:
- `BUNKER_URL` — Amber-NIP-46-Pairing für Signaturen
- `SPA_FTP_HOST/USER/PASS/REMOTE_PATH` — FTPS nach spa.joerg-lohrer.de
- `SVELTE_FTP_HOST/USER/PASS/REMOTE_PATH` — FTPS nach svelte.joerg-lohrer.de

Falls neue Bunker-URL nötig (Amber-Session kaputt):
- In Amber neue Bunker-URL generieren
- In `.env.local` ersetzen
- In Amber globale Permissions für die App löschen, sonst hängt der Request
