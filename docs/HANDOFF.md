# Handoff — Nächste Session

Du (Claude, nächste Session) oder ich (Jörg, später) kommen hier zurück.
Dieses Dokument sagt: was ist der Zustand, was wartet, wo liegen die Fäden.

## Zustand (Details in `STATUS.md`)

Die SvelteKit-SPA unter `svelte.joerg-lohrer.de` ist **fertig und live**.
Alle 18 Posts haben jetzt **strukturierte Bild-Metadaten** im Frontmatter
(Commit `c023b59`, 91 Bilder). Der Publish-Pipeline-**Plan ist geschrieben**
(`docs/superpowers/plans/2026-04-16-publish-pipeline.md`, 24 Tasks in 12 Phasen).

**Als nächstes:** Pipeline implementieren, beginnend mit Task 1.

## Was als Nächstes ansteht

### Option 1 — Publish-Pipeline implementieren ⬅ empfohlen

**Warum:** Spec + Plan fertig, Content vorbereitet, alle Design-Entscheidungen
getroffen. Kann direkt losgehen.

**Nächster konkreter Schritt:**

```
cd /Users/joerglohrer/repositories/joerglohrerde
```

Dann den Plan öffnen:
```
docs/superpowers/plans/2026-04-16-publish-pipeline.md
```

Und Task 1 (Deno-Projekt-Grundgerüst) starten. Der Plan nutzt TDD;
jeder Task hat Test-First, Implementation, Commit.

**Ausführungsweisen:**
- **Subagent-Driven** (im Plan empfohlen): pro Task frischer Subagent,
  Review zwischen Tasks. Skill: `superpowers:subagent-driven-development`.
- **Inline**: alles in einer Session. Skill: `superpowers:executing-plans`.

**Besonderheiten beim Plan:**
- Pipeline ist **Blaupause** für andere Nostr-Repos — keine
  Projekt-Konstanten im Code, alles via Env.
- **Env-File:** nutzt `../.env.local` (Repo-Root), wo `BUNKER_URL`,
  `AUTHOR_PUBKEY_HEX`, `BOOTSTRAP_RELAY` bereits stehen.
- **Blossom-only**: keine rsync/SSH-Altlasten mehr; alle Bilder (auch
  die der 17 Altposts) werden zu Blossom hochgeladen.
- **Staging:** `staging.joerg-lohrer.de` zeigt auf `/www/htdocs/v109928/joerglohrer26/`.
  Wird erst beim Cutover relevant — Pipeline selbst braucht es nicht.

**Vorarbeiten (bereits erledigt):**
- ✅ SSH-Zugang All-Inkl (Premium): `ssh-v109928@v109928.kasserver.com`
  mit Deploy-Key `~/.ssh/id_ed25519_joerglohrerde_deploy` (auch im KAS
  eingetragen). Wird jetzt allerdings nicht mehr für die Pipeline
  gebraucht — Blossom-only.
- ✅ `.env.local` enthält alle Pipeline-Keys.
- ✅ Content-Migration (18 Posts × Bild-Metadaten) abgeschlossen.

### Option 2 — Menü-Navigation + Impressum auf der SPA

**Warum:** kleine UX-Ergänzung, die das SPA-Erlebnis runder macht.

- Header-Navigation in `app/src/routes/+layout.svelte` ergänzen (Home, Archiv,
  Impressum, evtl. Mastodon-Link)
- `/impressum/`-Route anlegen mit rechtlichem Text
- ggf. Archives-Route als eigene Liste mit Gruppierung nach Jahr

**Aufwand:** ~30-60 min.

### Option 3 — Cutover auf Hauptdomain

**Voraussetzung:** Option 1 abgeschlossen und alle 18 Posts als Events
publiziert, Bilder auf Blossom.

**Dann:** KAS → Domain `joerg-lohrer.de` auf den SvelteKit-Webroot
umhängen (derselbe wie `svelte.joerg-lohrer.de` oder `joerglohrer26/`,
je nach Entscheidung).

Reihenfolge: **Option 1 → Option 3**, Option 2 kann parallel laufen.

## Schnell-Orientierung für die nächste Claude-Session

Lies in dieser Reihenfolge:
1. `docs/STATUS.md` (5 min)
2. `docs/HANDOFF.md` (= dieses Dokument)
3. Für die Pipeline: `docs/superpowers/plans/2026-04-16-publish-pipeline.md`
4. Bei Design-Fragen:
   - Publish-Pipeline: `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`
   - Bild-Metadaten: `docs/superpowers/specs/2026-04-16-image-metadata-convention.md`
   - SPA: `docs/superpowers/specs/2026-04-15-nostr-page-design.md`

Nutze den Skill unter `.claude/skills/joerglohrerde-workflow.md` für
wiederkehrende Kommandos.

## Dev-Kommandos

```sh
# Unit-Tests SPA (Vitest)
cd app && npm run test:unit

# E2E-Tests SPA (Playwright)
cd app && npm run test:e2e

# Type-Check SPA
cd app && npm run check

# SPA-Dev-Server (Port 5173)
cd app && npm run dev

# SPA-Production-Build + Deploy
cd app && npm run build && cd .. && ./scripts/deploy-svelte.sh
```

Publish-Pipeline-Kommandos (sobald implementiert):
```sh
cd publish && deno task check                            # Pre-Flight
cd publish && deno task publish --dry-run                # Simulation
cd publish && deno task publish --post <slug>            # einen Post
cd publish && deno task publish --force-all              # alle Posts
cd publish && deno task test                             # Tests
```

## Manuelles Publishen (Übergang, bis Pipeline fertig)

Siehe frühere Version dieses Dokuments. Bis die Pipeline läuft, gehen
neue Posts manuell über `nak event` raus.

## Bekannte Stolperfallen

- **Amber-Bunker:** bei neuer Bunker-URL müssen globale Permissions in Amber
  zurückgesetzt werden, sonst hängt `nak` auf den Signatur-Request.
  Auto-Approve für `kind:30023` und `kind:24242` (Blossom-Auth) setzen.
- **Svelte 5 Runes:** `$props()`-Werte müssen via `$derived()` in lokale
  Variablen, sonst `state_referenced_locally`-Warning.
- **applesauce-relay API:** ist RxJS-basiert. `pool.request(relays, filter)`
  returned `Observable<NostrEvent>` (nicht die Tupel-`subscribe({next: msg
  if msg[0]==='EVENT'})`-Form).
- **Slug-Normalisierung:** alle Frontmatter-Slugs sind lowercase (Commit
  `d17410f`). Beim Publishen 1:1 übernehmen, keine Runtime-Transformation.
- **Dateiname mit Leerzeichen:** im Moodle-Post liegt `03-config generieren.png`.
  Pipeline muss URL-Encoding im `rewriteImageUrls`-Helper korrekt umsetzen
  (Test ist im Plan Task 5 vorgesehen).

## Session-Kontext

Hilfreich beim Wiedereinstieg mit Claude:
- Branch-Check: `git log --oneline -10 spa main hugo-archive`
- Live-Check: `curl -sI https://svelte.joerg-lohrer.de/`
- Publish-Status: `nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -s 'length'`
  (aktuell ~10, nach Pipeline-Lauf `--force-all`: 18)

## Offene UNKNOWN-Einträge zur späteren Recherche

Im VR-Post (`content/posts/2021-08-15-virtual-reality/index.md`)
sind 4 Bilder als `license: UNKNOWN / authors: UNKNOWN` markiert:
- `01-immersion-wikipedia.jpg` (Wikipedia-Screenshot)
- `02-mittelalterliche-kirche.jpg` (Sketchfab — Lizenz ist CC BY-NC, Fotograf fehlt)
- `03-avatare-erstellen.jpg` (Ready Player Me)
- `05-pupillendistanz.jpg` (EyeMeasure iOS App)

Pipeline loggt beim Publishen eine Warnung pro UNKNOWN, publisht aber
trotzdem (Phase-1-Default: `STRICT_MODE=false`). Die Recherche-Todo-Liste
steht in `docs/redaktion-bild-metadaten.md`.

## Community-Wiki-Entwürfe

Noch nicht extern veröffentlicht, liegen im Repo bereit:
- `docs/wiki-entwurf-nostr-bild-metadaten.md` — DE
- `docs/wiki-draft-nostr-image-metadata.md` — EN

Können in die Nostr-Community eingebracht werden (z. B. als NIP-Proposal
oder auf nostrbook.dev), sobald die Pipeline sie in der Praxis validiert.
