# Handoff — Nächste Session

Du (Claude, nächste Session) oder ich (Jörg, später) kommen hier zurück.
Dieses Dokument sagt: was ist der Zustand, was wartet, wo liegen die Fäden.

## Zustand (Details in `STATUS.md`)

**Die Nostr-Publish-Pipeline ist live.** Alle 18 Posts sind publiziert als
`kind:30023`-Events auf 5 Relays, 91 Bilder auf 2 Blossom-Servern. Die
SvelteKit-SPA unter `svelte.joerg-lohrer.de` rendert alles ordentlich.

**Das inhaltliche Kernziel des Gesamtprojekts ist damit erreicht.**

Der Rest sind Feinschliff- und Cutover-Aufgaben.

## Was als Nächstes ansteht

### Option 1 — CI-End-to-End-Test ⬅ kleinstes Offene

**Voraussetzung erledigt:** Forgejo → GitHub Push-Mirror läuft, GitHub-Secrets
gesetzt (Details in `docs/github-ci-setup.md`).

**Noch zu tun:**
1. In GitHub → Actions → „Publish Nostr Events" → „Run workflow" → Branch
   `main`. Erwartung: Pre-Flight grün, 0 Posts (kein Content-Diff), Exit 0.
2. Optional: Minimaler Edit in einem Post → commit → push → warten bis
   Mirror auf GitHub synct → Workflow triggert automatisch → 1 Post als
   `update` publiziert → Log-Artefakt prüfen.

Danach ist Task 22 komplett abgeschlossen.

### Option 2 — Cutover auf `joerg-lohrer.de`

**Voraussetzung:** Option 1 optional, aber nicht blockierend. Die Pipeline
läuft ja schon, ob manuell oder via CI ist für den Cutover egal.

**Schritte:**
1. In All-Inkl KAS die Domain `joerg-lohrer.de` auf den SvelteKit-Webroot
   umhängen (aktuell: `svelte.joerg-lohrer.de` → `/www/htdocs/v109928/joerglohrer28/`
   oder welcher Ordner auch immer).
2. SvelteKit-SPA deployen, sofern sie nicht schon dort liegt.
3. Live-Check: `curl -sI https://joerg-lohrer.de/` → sollte die neue SPA
   liefern, nicht mehr Hugo.

Hugo-Altbestand bleibt als Archiv im `hugo-archive`-Branch.

### Option 3 — Menü-Navigation + Impressum in der SPA

**Unabhängig von allem anderen**, kann parallel gemacht werden.

- Header-Navigation in `app/src/routes/+layout.svelte` (Home, Archiv, Impressum,
  Mastodon-Link)
- `/impressum/`-Route mit rechtlichem Text

**Aufwand:** 30–60 min.

### Option 4 — Pipeline weg von GitHub (self-hosted CI)

**Wann:** Wenn der Optiplex-Server steht und ein zentraler Ort für Dienste
existiert.

**Varianten:**
- **Cron / systemd-Timer** auf dem Optiplex, der alle X Minuten `git pull &&
  deno task publish` macht. Einfach, minimaler Setup.
- **Woodpecker-CI** als Docker-Container neben Forgejo. Volle Push-getriggerte
  Pipeline ohne GitHub.

Der Pipeline-Code selbst (`publish/src/**`) ist CI-agnostisch — nur die
Trigger-Konfiguration ändert sich.

## Schnell-Orientierung für die nächste Claude-Session

Lies in dieser Reihenfolge:
1. `docs/STATUS.md` (5 min)
2. `docs/HANDOFF.md` (= dieses Dokument)
3. Für CI-Themen: `docs/github-ci-setup.md`
4. Für Pipeline-Fragen: `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`

## Dev-Kommandos

```sh
# SPA-Tests
cd app && npm run test:unit
cd app && npm run test:e2e
cd app && npm run check
cd app && npm run dev

# SPA-Build + Deploy
cd app && npm run build && cd .. && ./scripts/deploy-svelte.sh

# Publish-Pipeline
cd publish && deno task check                          # pre-flight
cd publish && deno task publish --dry-run              # diff-modus simulation
cd publish && deno task publish                        # diff-modus echt
cd publish && deno task publish --force-all            # alle posts
cd publish && deno task publish --post <slug>          # einen post
cd publish && deno task test                           # 59 tests
```

## Bekannte Stolperfallen

- **Amber-Bunker:** bei neuer Bunker-URL müssen die zwei Permissions
  (`get_public_key`, `sign_event`) in Amber auf „Allow + Always" gesetzt
  werden, bevor Publish-Requests verarbeitet werden. Siehe
  `docs/github-ci-setup.md` für Details.
- **`CLIENT_SECRET_HEX`** in `.env.local` identisch mit GitHub-Secret —
  sorgt dafür, dass sich beide Umgebungen bei Amber mit derselben App
  anmelden. Rotieren nur bei bewusstem Neu-Pairing in Amber.
- **`relay.damus.io`** bestätigt Events manchmal nicht mit `OK`. Bekanntes
  Damus-Verhalten, wird toleriert (MIN_RELAY_ACKS=2, andere 4 Relays sind
  zuverlässig).
- **Svelte 5 Runes:** `$props()`-Werte via `$derived()` in lokale Variablen.
- **Hugo-quotierte Dates:** `date: "2023-02-26"` ist ein YAML-String, nicht
  ein Date-Objekt. `validatePost` coerced das automatisch; in neuen Posts
  am besten ohne Quotes schreiben.

## Offene UNKNOWN-Einträge zur späteren Recherche

Im VR-Post (`content/posts/2021-08-15-virtual-reality/index.md`) sind
4 Bilder als `license: UNKNOWN / authors: UNKNOWN` markiert:
- `01-immersion-wikipedia.jpg` (Wikipedia-Screenshot)
- `02-mittelalterliche-kirche.jpg` (Sketchfab — Lizenz ist CC BY-NC, Fotograf fehlt)
- `03-avatare-erstellen.jpg` (Ready Player Me)
- `05-pupillendistanz.jpg` (EyeMeasure iOS App)

Pipeline loggt Warnungen, publisht aber trotzdem. Recherche-Notizen in
`docs/redaktion-bild-metadaten.md`.

## Session-Kontext

Hilfreich beim Wiedereinstieg mit Claude:
- Branch-Check: `git log --oneline -10 spa main`
- Live-Check SPA: `curl -sI https://svelte.joerg-lohrer.de/`
- Event-Count: `nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.primal.net 2>/dev/null | jq -s 'length'` → 18
- Pipeline-Tests: `cd publish && deno task test` → 59 grün

## Community-Wiki-Entwürfe

Liegen im Repo, noch nicht extern veröffentlicht:
- `docs/wiki-entwurf-nostr-bild-metadaten.md` — DE
- `docs/wiki-draft-nostr-image-metadata.md` — EN

Können als NIP-Proposal oder auf nostrbook.dev eingebracht werden, jetzt wo
die Konvention in der Praxis validiert ist.
