# Handoff — Nächste Session

Du (Claude, nächste Session) oder ich (Jörg, später) kommen hier zurück.
Dieses Dokument sagt: was ist der Zustand, was wartet, wo liegen die Fäden.

## Zustand (Details in `STATUS.md`)

**Cutover + Reimport am 2026-04-18 abgeschlossen.** `joerg-lohrer.de`
läuft als SvelteKit-SPA, rendert 26 Nostr-Langform-Posts live aus 5
Relays, Bilder auf Blossom. Repo ist alleinige Quelle der Wahrheit.
Pipeline-Subcommands `publish` + `delete` decken den kompletten
Content-Lifecycle ab.

**Das inhaltliche Kernziel des Gesamtprojekts ist erreicht.** Der Rest
sind optionale Verbesserungen.

## Alltags-Workflow: neuen Post veröffentlichen

**Kompletter Happy-Path, kein manueller Publish nötig:**

1. Neuen Ordner anlegen: `content/posts/YYYY-MM-DD-<slug>/`
2. `index.md` schreiben mit Frontmatter (siehe Template unten).
3. Bilder in den Ordner legen und im Markdown als `![alt](bildname.jpg)`
   referenzieren.
4. Lokal validieren: `cd publish && deno task validate-post ../content/posts/<dir>/index.md`
5. Commit + `git push origin main` — fertig.

**Was automatisch passiert:**
- Forgejo-Push-Mirror synct nach GitHub.
- GitHub Actions triggert auf `content/posts/**`-Änderung.
- Workflow läuft diff-modus: nur geänderte/neue Posts werden publiziert.
- Pipeline hasht lokale Bilder → Upload auf beide Blossom-Server → URLs
  im Event ersetzen.
- Event wird signiert (Amber-Bunker via `CLIENT_SECRET_HEX`) und auf alle
  5 Write-Relays publiziert.
- SPA holt den neuen Post beim nächsten Besuch automatisch vom Relay.

**Vorbedingung:** Amber muss für den Client-Key (aus `CLIENT_SECRET_HEX`)
die Permissions `get_public_key` + `sign_event` auf „Allow + Always"
gesetzt haben. Das gilt so lange, bis der Client-Key rotiert wird.

**Minimal-Frontmatter für einen neuen Post:**

```yaml
---
title: "Titel des Posts"
slug: "url-freundlicher-slug"
date: 2026-04-18
description: "Kurzbeschreibung für SEO und den summary-Tag im Event."
image: hauptbild.jpg
tags:
  - Tag1
  - Tag2
lang: de
license: https://creativecommons.org/publicdomain/zero/1.0/deed.de
---

Body in Markdown…
```

Bilder mit voller Attribution (NIP-standardisiert nach unserer Konvention,
siehe `docs/superpowers/specs/2026-04-16-image-metadata-convention.md`):

```yaml
images:
  - file: hauptbild.jpg
    role: cover
    alt: "Alt-Text für Barrierefreiheit"
    caption: "Bildunterschrift (optional)"
    license: https://creativecommons.org/licenses/by/4.0/deed.de
    authors:
      - name: "Autor:in"
```

**Manuell publizieren** (falls CI aus ist oder einzelner Post nochmal):

```sh
cd publish
deno task publish --post <slug>          # einzelner Post
deno task publish --dry-run              # was würde der diff-modus publisht?
deno task publish                        # diff-modus real
deno task publish --force-all            # alle 26 Posts neu
```

## Was optional als Nächstes ansteht

### Option B — SPA respektiert NIP-09-Deletion-Events

**Status:** aktuell filtert die SPA nicht nach NIP-09. Wenn ein Event per
`kind:5`-Referenz gelöscht wurde, zeigen Relays es meist nicht mehr aus —
aber die SPA würde es trotzdem rendern, falls ein Relay es doch liefert.

**Zu tun:** im `kind:30023`-Loader (`app/src/lib/nostr/…`) einen
Cross-Check auf `kind:5`-Events einbauen. Events, deren Addressable-Pointer
(`30023:pubkey:d-tag`) in einem `kind:5` referenziert ist, werden
gefiltert. Defensive Maßnahme für zukünftige Duplikate / Soft-Deletes.

### Option C — Postfach `webmaster@joerg-lohrer.de`

User-Task: im All-Inkl KAS als Weiterleitung anlegen. Der Link im
Footer und in den Social-Icons zeigt bereits darauf.

### Option D — Mehrsprachigkeit (Translation-of)

**Grundlage steht:** Pipeline taggt seit 2026-04-18 jedes Event mit
NIP-32 `['L', 'ISO-639-1']` + `['l', 'de', 'ISO-639-1']` (default),
überschreibbar per `lang:`-Frontmatter.

**Zu tun für einen bilingualen Post:**
1. Zweiter Markdown-Ordner, z. B. `content/posts/<date>-<slug>-en/index.md`,
   mit `slug: <slug>-en`, `lang: en`, englischem Body.
2. Publish → eigenes `kind:30023`-Event mit `lang=en`.
3. (Noch zu bauen) Pipeline erweitern: `translation_of:`-Frontmatter-Feld,
   das ein `['a', '30023:pubkey:<slug-de>']`-Tag ins Event setzt. Damit
   erkennen Clients wie Habla die Verwandtschaft.
4. (Optional) SPA bekommt Language-Switcher auf der Post-Detailseite.

Nicht dringend, erst wenn echter englischer Content entsteht.

### Option E — Pipeline weg von GitHub (self-hosted CI)

**Wann:** Wenn der Optiplex-Server steht und ein zentraler Ort für Dienste
existiert.

**Varianten:**
- **Cron / systemd-Timer** auf dem Optiplex, der alle X Minuten `git pull &&
  deno task publish` macht. Einfach, minimaler Setup.
- **Woodpecker-CI** als Docker-Container neben Forgejo. Volle Push-getriggerte
  Pipeline ohne GitHub.

Der Pipeline-Code selbst (`publish/src/**`) ist CI-agnostisch — nur die
Trigger-Konfiguration ändert sich.

### Option F — Design-Refinements

**Wann:** irgendwann, wenn Lust drauf ist.

- Parallax-Effekte, Animationen
- Dark-Mode-Toggle (aktuell nur `prefers-color-scheme`)
- Typografie-Experimente (Variable Fonts)
- Bildergalerie-Komponente für Posts mit vielen Bildern

Alles nicht-blockierend, die SPA funktioniert solide.

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
DEPLOY_TARGET=staging ./scripts/deploy-svelte.sh
DEPLOY_TARGET=prod ./scripts/deploy-svelte.sh

# Publish-Pipeline
cd publish && deno task check                          # pre-flight
cd publish && deno task publish --dry-run              # diff-modus simulation
cd publish && deno task publish                        # diff-modus echt
cd publish && deno task publish --force-all            # alle posts
cd publish && deno task publish --post <slug>          # einen post
cd publish && deno task delete --event-id <hex> [--event-id <hex>] [--reason "text"]
cd publish && deno task validate-post ../content/posts/<dir>/index.md
cd publish && deno task test                           # tests
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
- **Deploy-Targets:** `svelte` → Entwicklung, `staging` → Pre-Prod,
  `prod` → `joerglohrer26/` (Produktion seit Cutover). Script parst
  `.env.local` per awk (wegen Sonderzeichen in FTP-Passwörtern).
- **Slug-Hygiene:** nur `[a-z0-9-]`, keine Umlaute/Emojis/Doppelpunkte.
  Der Slug landet als `d`-Tag im Event und wird zur URL. Einmal
  publiziert, ist Umbenennen nur über Delete + Re-Publish mit neuem Slug
  möglich.
- **Clients, die Markdown ignorieren:** Yakihonne/Habla kennen NIP-32
  Sprach-Tags; kurzen Text in `description:` halten, damit die Vorschau
  überall sinnvoll aussieht.

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
- Branch-Check: `git log --oneline -10 main`
- Live-Check: `curl -sI https://joerg-lohrer.de/`
- Event-Count Repo vs. Relays:
  ```sh
  ls content/posts/ | wc -l
  nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.edufeed.org 2>/dev/null | jq -r '.tags[]|select(.[0]=="d")|.[1]' | sort -u | wc -l
  ```
- Pipeline-Tests: `cd publish && deno task test`

## Community-Wiki-Entwürfe

Liegen im Repo, noch nicht extern veröffentlicht:
- `docs/wiki-entwurf-nostr-bild-metadaten.md` — DE
- `docs/wiki-draft-nostr-image-metadata.md` — EN

Können als NIP-Proposal oder auf nostrbook.dev eingebracht werden, jetzt wo
die Konvention in der Praxis validiert ist.
