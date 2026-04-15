# Handoff — Nächste Session

Du (Claude, nächste Session) oder ich (Jörg, später) kommen hier zurück.
Dieses Dokument sagt: was ist der Zustand, was wartet, wo liegen die Fäden.

## Zustand (siehe `STATUS.md` für Details)

Die SvelteKit-SPA unter `svelte.joerg-lohrer.de` ist **fertig und live**.
35 geplante Tasks + einige Erweiterungen abgeschlossen. Branch `spa` hat
alle Commits. Ein Git-Merge nach `main` und Deploy auf die Hauptdomain ist
**noch nicht** erfolgt — das kommt erst nach dem Cutover-Plan.

## Was als Nächstes ansteht

Drei Optionen, ordered by natürlichkeit der Fortsetzung:

### Option 1 — Publish-Pipeline bauen

**Warum:** aktuell muss Jörg jeden neuen Post manuell mit `nak event` signieren
und publishen (siehe `preview/spa-mini/README.md`, Referenzbefehl in den
Brainstorm-Notizen). Eine Publish-Pipeline automatisiert:

1. Markdown-Post in `content/posts/` bearbeiten / neu anlegen
2. Git-Commit + push auf `main`
3. GitHub Action signiert Event via NIP-46 (Amber-Bunker), pushed zu allen
   Relays aus `kind:10002`, lädt Bilder zu Blossom, lädt Altbild-Assets
   ggf. zu All-Inkl via SSH/rsync.

**Was existiert:** Spec vollständig unter
`docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`. Plan
**noch nicht geschrieben.**

**Nächster Konkreter Schritt:**
```
superpowers:writing-plans
```
mit dem Publish-Spec als Input.

**Vorarbeiten:**
- SSH-Zugang zu All-Inkl klären (Premium-Tarif angefragt, Status prüfen)
- Deno ≥ 2.x installiert?
- GitHub Actions-Repo-Secrets vorbereiten (`BUNKER_URL`, `ALLINKL_DEPLOY_ROOT`,
  `SSH_DEPLOY_KEY`, `AUTHOR_PUBKEY_HEX`)

### Option 2 — Menü-Navigation + Impressum auf der SPA

**Warum:** kleine UX-Ergänzung, die das SPA-Erlebnis runder macht.

- Header-Navigation in `app/src/routes/+layout.svelte` ergänzen (Home, Archiv,
  Impressum, evtl. Mastodon-Link)
- `/impressum/`-Route anlegen mit rechtlichem Text
- ggf. Archives-Route als eigene Liste mit Gruppierung nach Jahr

**Aufwand:** ~30-60 min je nach Layout-Wunsch. Kein Spec-Update nötig,
ist in SPA-Spec §2 bereits als Ziel erwähnt.

### Option 3 — Cutover auf Hauptdomain

**Warum:** `joerg-lohrer.de` liefert aktuell noch Hugo aus. Sobald genug
Altposts als Events publiziert sind und die Publish-Pipeline läuft, kann die
SvelteKit-SPA auf die Hauptdomain umziehen. Das ist aber **kein Task jetzt**
— muss auf Publish-Pipeline warten, sonst brechen Backlinks zu Posts, die
noch nicht als Events existieren.

**Reihenfolge:** Option 1 → Publish-Pipeline + einmaliger Massen-Import der
übrigen 17 Altposts → dann Option 3.

## Schnell-Orientierung für die nächste Claude-Session

Lies in dieser Reihenfolge:
1. `docs/STATUS.md` (5 min)
2. `docs/HANDOFF.md` (= dieses Dokument)
3. Die relevante Spec, je nachdem was drankommt:
   - Publish-Pipeline: `docs/superpowers/specs/2026-04-15-publish-pipeline-design.md`
   - SPA-Anpassungen: `docs/superpowers/specs/2026-04-15-nostr-page-design.md`

Nutze den Skill unter `.claude/skills/joerglohrerde-workflow.md` für
wiederkehrende Kommandos.

## Dev-Kommandos

```sh
# Unit-Tests (Vitest)
cd app && npm run test:unit

# E2E-Tests (Playwright)
cd app && npm run test:e2e

# Type-Check
cd app && npm run check

# Dev-Server (Port 5173)
cd app && npm run dev

# Production-Build + Deploy
cd app && npm run build && cd .. && ./scripts/deploy-svelte.sh
```

## Manuelles Publishen (bis Publish-Pipeline fertig ist)

Einen Post aus `content/posts/<ordner>/index.md` als kind:30023-Event
publizieren:

```sh
# Body ohne Frontmatter extrahieren
awk 'BEGIN{in_fm=0; past_fm=0} NR==1 && /^---$/ {in_fm=1; next} in_fm && /^---$/ {in_fm=0; past_fm=1; next} past_fm {print}' content/posts/<ordner>/index.md > /tmp/body.md

# Bunker-URL aus .env.local
BUNKER_URL=$(grep -E '^BUNKER_URL=' .env.local | sed 's/^BUNKER_URL=//')

# Event bauen, signieren, zu Relays pushen
# (Tags: d, title, summary, image, published_at, t×n)
# Siehe "dezentrale-oep-oer"-Beispiel in der Brainstorm-Historie
```

Für Bilder: Upload zu Blossom mit `nak blossom upload`:
```sh
nak blossom upload --server https://blossom.edufeed.org --sec "$BUNKER_URL" <bild>
```

## Bekannte Stolperfallen

- **Amber-Bunker:** bei neuer Bunker-URL müssen globale Permissions in Amber
  zurückgesetzt werden, sonst hängt `nak` auf den Signatur-Request.
- **All-Inkl FTPS:** bricht mit TLS 1.3 die Data-Connection ab. Script
  nutzt `--tls-max 1.2`. Bei SSH-Umstellung: rsync fixen, TLS-Flag raus.
- **Svelte 5 Runes:** `$props()`-Werte müssen via `$derived()` in lokale
  Variablen, sonst `state_referenced_locally`-Warning.
- **applesauce-relay API:** ist RxJS-basiert. `pool.request(relays, filter)`
  returned `Observable<NostrEvent>` (nicht die Tupel-`subscribe({next: msg
  if msg[0]==='EVENT'})`-Form).
- **Slug-Normalisierung:** alle Frontmatter-Slugs sind lowercase (Commit
  `d17410f`). Beim Publishen 1:1 übernehmen, keine Runtime-Transformation.

## Session-Kontext

Hilfreich beim Wiedereinstieg mit Claude:
- Branch-Check: `git log --oneline -10 spa main hugo-archive`
- Live-Check: `curl -sI https://svelte.joerg-lohrer.de/`
- Publish-Status: `nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.damus.io 2>/dev/null | jq -c '{d: (.tags[] | select(.[0]=="d") | .[1]), title: (.tags[] | select(.[0]=="title") | .[1])}'`
