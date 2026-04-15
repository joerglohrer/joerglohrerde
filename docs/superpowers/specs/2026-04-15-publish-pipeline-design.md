# Publish-Pipeline für Nostr-Events — Design-Spec

**Datum:** 2026-04-15
**Status:** Entwurf, ausstehende User-Freigabe
**Scope:** Toolchain, die Markdown-Posts aus `content/posts/*/index.md` in signierte Nostr-Events (`kind:30023`, NIP-23) umwandelt, zu Relays publiziert, und die zugehörigen Bilder zum Asset-Host (All-Inkl für Altposts, Blossom für neue) hochlädt.

Diese Spec ist die Schwester-Spec zu [`2026-04-15-nostr-page-design.md`](2026-04-15-nostr-page-design.md) und teilt sich mit ihr den Event-Kontrakt für `kind:30023` und die Konfiguration über `kind:10002` / `kind:10063`.

---

## 1. Gesamtarchitektur

```
                       Auslöser
       ┌───────────────────┬───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
  Lokaler CLI         GitHub Action       workflow_dispatch
  `deno task         (push auf main,     (--force-all, z. B.
   publish`          wenn content/       für Migration oder
                     posts/** geändert)  Reimport)
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
              ┌─────────────────────────────┐
              │ Publish-Pipeline (Deno)     │
              │ gemeinsame Library + CLI    │
              │                             │
              │ 1. Nostr-Kontext laden:     │
              │    • kind:10002 (Relays)    │
              │    • kind:10063 (Blossom)   │
              │ 2. Change-Detection         │
              │    (Git-Diff oder force)    │
              │ 3. Pro Post:                │
              │    a. Frontmatter parsen    │
              │    b. Markdown transform    │
              │    c. Bilder upload         │
              │       (legacy/blossom)      │
              │    d. Event bauen           │
              │    e. Via NIP-46 signieren  │
              │    f. Zu Relays pushen      │
              └──────┬──────────────────────┘
                     │
          ┌──────────┼──────────────┬──────────────┐
          ▼          ▼              ▼              ▼
       Amber      Public        Blossom-        All-Inkl
       (NIP-46    Nostr-        Server          (rsync
        Signer    Relays        (primal,         over SSH,
        via       aus           später eigen)   Altbilder
        Relay)    kind:10002    aus             der 18
                                kind:10063)     Migrations-
                                                posts)
```

### Kernprinzipien

- **Deno als Runtime.** Native TypeScript, Permissions-Modell, keine `node_modules`.
- **Gemeinsame Library + CLI.** Kernlogik in Modulen, sowohl von lokaler CLI als auch von CI-Workflow importiert. Keine Duplikation.
- **Nostr als Source-of-Truth für Konfiguration.** Relay-Liste aus `kind:10002`, Blossom-Serverliste aus `kind:10063`. Keine YAML-Config im Repo.
- **NIP-46 Bunker für Signaturen.** Der private Schlüssel liegt nie in der Pipeline-Umgebung (nicht lokal, nicht in CI-Secrets). Bunker-Stufe Amber zum Start, Bunker-Stufe Optiplex nachrüstbar ohne Code-Change.
- **Git-Diff als Change-Detection.** Pipeline publisht nur geänderte Posts. Override-Flag für Migration und Reimport.
- **State-los im Repo.** Keine Lock-Files, kein Commit-zurück. CI ist read-only auf Repo-Content.
- **Idempotenz.** Wiederholte Läufe ohne inhaltliche Änderung erzeugen keine neuen Events (Git-Diff filtert).

### Kostenübersicht

- Deno: 0 €.
- Amber, Public-Relays, Public-Blossom: 0 €.
- GitHub-Actions: im Free-Tier für persönliche Repos ausreichend.
- All-Inkl: unverändert, bereits Premium-Tarif für SSH.
- **Zusatzkosten: keine.**

### Out-of-Scope

Diese Spec behandelt nicht:
- **Kommentare/Reactions auf Posts.** Die kommen von Besuchern über die SPA via NIP-07 (siehe SPA-Spec §3). Publish-Pipeline publisht ausschließlich Autor-eigene `kind:30023`.
- **SPA-Deployment** (SvelteKit-Bundle-Upload). Wird in einem separaten Deploy-Mechanismus behandelt oder als optionaler Subcommand nachgerüstet.
- **Domain-Verwaltung, TLS-Zertifikate, All-Inkl-Paketwahl.** Infrastruktur-seitig außerhalb der Pipeline.

---

## 2. Pre-Flight-Setup

Bevor der erste Publish-Lauf erfolgen kann, müssen folgende Bedingungen einmalig manuell erfüllt sein. Der Subcommand `deno task check` verifiziert die Punkte und gibt klare Fehlermeldungen aus, wenn etwas fehlt.

### 2.1 Nostr-Identität

- Pubkey des Autors: **npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9**
- Privater Schlüssel (`nsec`) existiert nur in **Amber** auf dem Handy des Autors. Keine andere Instanz hält ihn.

### 2.2 NIP-46-Bunker-Pairing (Amber)

1. Auf dem Handy: Amber öffnen, Account wählen.
2. In Amber: „Generate Bunker URL" o. ä. — erzeugt eine `bunker://<hex-pubkey>?relay=wss://...&secret=...` URL.
3. Im Handy-Amber: Permission-Regeln setzen:
   - `kind:30023` signieren → **auto-approve** für die Publish-Pipeline-App
   - alle anderen Kinds → prompt (Sicherheitsnetz, sollte nicht aufschlagen)
4. Bunker-URL in die Pipeline-Umgebung einfügen:
   - **Lokal:** in `.env` als `BUNKER_URL=bunker://...` (in `.gitignore`)
   - **CI:** als GitHub-Actions-Secret `BUNKER_URL`
5. Amber muss während CI-Runs online sein (WLAN oder mobile Daten). Akku-Optimierung für Amber auf dem Handy deaktivieren.

### 2.3 Relay-Liste (`kind:10002`)

Einmalig manuell publizieren via Nostr-Client (z. B. nostrudel.ninja mit Amber-Login, oder direkt aus Amber).

**Schema (NIP-65):**

```json
{
  "kind": 10002,
  "pubkey": "<hex>",
  "tags": [
    ["r", "wss://relay.damus.io"],
    ["r", "wss://nos.lol"],
    ["r", "wss://relay.nostr.band"],
    ["r", "wss://nostr.wine"]
  ],
  "content": "",
  "created_at": <unix>
}
```

**Lese-Semantik der Pipeline (NIP-65):**

- `["r", <url>]` ohne drittes Element → Relay ist sowohl Read als auch Write.
- `["r", <url>, "read"]` → nur Read; Pipeline **ignoriert** beim Publish.
- `["r", <url>, "write"]` → nur Write; Pipeline nutzt beim Publish.

Phase 1: alle Einträge ohne drittes Element (beides). Spätere Differenzierung möglich, ohne Code-Änderung.

Replaceable Event (kein `d`-Tag) — bei späteren Updates (z. B. eigener Relay hinzu) wird einfach ein neues `kind:10002` publiziert, das das alte ersetzt.

### 2.4 Blossom-Serverliste (`kind:10063`)

Einmalig manuell publizieren. Phase-1-Inhalt: ein Server.

**Schema (BUD-03):**

```json
{
  "kind": 10063,
  "pubkey": "<hex>",
  "tags": [
    ["server", "https://blossom.primal.net"]
  ],
  "content": "",
  "created_at": <unix>
}
```

Phase-5-Erweiterung (eigener Blossom-Server): zusätzliches `["server", "https://blossom.joerg-lohrer.de"]` wird vorne in die Liste aufgenommen, neues Event publiziert.

### 2.5 SSH-Deploy-Key für All-Inkl

1. Lokal Keypair erzeugen, **dediziert für Deploys**, nicht persönlicher SSH-Key:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_joerglohrerde_deploy -C "deploy-joerglohrerde"
   ```
   Ohne Passphrase (CI braucht non-interactive Zugang).
2. Public-Key-Inhalt (`*.pub`) in All-Inkl-KAS unter „SSH-Zugänge" → „Authorized Keys" eintragen.
3. Verbindung testen: `ssh -i ~/.ssh/id_ed25519_joerglohrerde_deploy w00xxxxx@ssh.all-inkl.com`
4. Private-Key bereitstellen:
   - **Lokal:** liegt in `~/.ssh/` und wird von rsync automatisch genutzt.
   - **CI:** als GitHub-Actions-Secret `SSH_DEPLOY_KEY` (Inhalt der privaten Key-Datei). Im Workflow wird er in `~/.ssh/id_ed25519` gechrieben und `chmod 600` gesetzt.

### 2.6 All-Inkl Deploy-Root

Nach Tarifwechsel auf Premium: Pfad im KAS unter „Dateiverwaltung" ablesen. Typisch: `w00xxxxx@ssh.all-inkl.com:joerg-lohrer.de/`.

- **Lokal:** in `.env` als `ALLINKL_DEPLOY_ROOT`
- **CI:** als GitHub-Actions-Secret

### 2.7 `deno task check`

Dieser Subcommand verifiziert alle obigen Punkte:

- `BUNKER_URL` gesetzt, Bunker antwortet auf Ping, Pubkey stimmt mit `AUTHOR_PUBKEY_HEX` überein.
- `kind:10002` auf Bootstrap-Relay gefunden, mindestens 1 Relay eingetragen.
- `kind:10063` auf Bootstrap-Relay gefunden, mindestens 1 Server eingetragen.
- SSH-Verbindung zu `ALLINKL_DEPLOY_ROOT` erfolgreich (`ssh ... echo ok`).
- Deno-Version und benötigte Permissions.

Bei jedem Fehler: klare Text-Meldung, was zu tun ist (z. B. „kind:10002 fehlt — publiziere es manuell mit folgendem Schema: ...").

---

## 3. Event-Kontrakt (normativ)

### 3.1 `kind:30023` — Blog-Post (NIP-23)

**Pflicht-Tags:**

- `["d", "<slug>"]` — Slug-String, identisch mit Frontmatter `slug:`. Lowercase und URL-kompatibel (a–z, 0–9, `-`). Ist Teil des Tupels `(pubkey, kind, d)` für Replaceable-Semantik.
- `["title", "<title-string>"]` — aus Frontmatter `title:`.
- `["published_at", "<unix-seconds>"]` — aus Frontmatter `date:`, als Unix-Zeitstempel in Sekunden. **Stabil** über Edits hinweg — ändert sich nie.

**Empfohlene Tags (wenn im Frontmatter vorhanden):**

- `["summary", "<summary>"]` — aus Frontmatter `description:`.
- `["image", "<absolute-url>"]` — aus Frontmatter `cover.image:` (oder `image:`), transformiert zur absoluten URL gemäß Abschnitt 4.
- `["t", "<tag>"]` — ein Tag-Element pro Eintrag in Frontmatter `tags:`. Tag-Strings unverändert übernommen (Groß-/Kleinschreibung erhalten, weil Tag-Konvention im Nostr-Ökosystem case-sensitive ist).

**Event-Header:**

- `kind`: 30023
- `pubkey`: `AUTHOR_PUBKEY_HEX`
- `created_at`: Unix-Zeitstempel des Signatur-Zeitpunkts (ändert sich bei jedem Edit).
- `content`: Markdown-Body nach Bild-URL-Transformation (Abschnitt 4).

**Nicht gemappt** (Hugo-spezifische Frontmatter-Felder ohne Nostr-Entsprechung):

`layout`, `cover.caption`, `cover.alt`, `author`, `lang`, `dir`, `toc`, `toc_label`, `toc_icon`, `comments`, `weight`, `menus`, `aliases`, `draft`.

**Draft-Behandlung:** `draft: true` im Frontmatter → Pipeline publisht diesen Post **nicht** (überspringt ohne Fehler, loggt Info).

### 3.2 `kind:10002` — NIP-65 Outbox-Relays

Siehe Abschnitt 2.3. Von der Publish-Pipeline nur **gelesen** (Bootstrap beim Start); nicht von der Pipeline publiziert.

### 3.3 `kind:10063` — BUD-03 Blossom-Serverliste

Siehe Abschnitt 2.4. Von der Publish-Pipeline nur **gelesen** (vor Blossom-Upload); nicht von der Pipeline publiziert.

### 3.4 Signing

Alle ausgehenden Events werden via **NIP-46 Bunker** signiert (nicht NIP-07 — dieser Flow ist rein browserseitig und für die CLI nicht anwendbar). Implementierung via `applesauce-signers` `Nip46Signer`:

```ts
const signer = new Nip46Signer(BUNKER_URL)
await signer.getPublicKey() // initialisiert Verbindung
const signed = await signer.signEvent(unsignedEvent)
```

---

## 4. Markdown- und Bild-Transformation

### 4.1 Frontmatter-Parsing

YAML-Frontmatter zwischen `---`-Trennern. Parser: `jsr:@std/yaml` oder `npm:gray-matter`.

Slug kommt als **lowercase String** aus dem Frontmatter-Feld `slug:`. Ist bereits normalisiert (siehe Commit `d17410f`) — Pipeline muss nichts ableiten oder lowercasen.

**Validierung:**
- `title`, `date`, `slug` müssen vorhanden sein; sonst harter Fehler für diesen Post.
- `slug` muss regex `^[a-z0-9][a-z0-9-]*$` matchen; sonst harter Fehler.

### 4.2 Bild-URL-Transformation

Ziel: alle relativen Bild-Referenzen im Markdown-Body werden zu absoluten URLs.

**Erkannte Muster:**
- `![alt](filename)` — reguläre Markdown-Bild-Syntax.
- `[![alt](filename)](link)` — Bild-in-Link-Konstrukt.
- `![alt](filename =WxH)` — mit Größen-Suffix (Obsidian/PaperMod-Erweiterung).

**Regeln:**
1. Wenn `filename` ein Schema enthält (`http://`, `https://`, `//`), nicht transformieren — ist schon absolut.
2. Ansonsten zu absoluter URL machen; URL-Kodierung pro Pfad-Segment via `encodeURIComponent()`.
3. `=WxH`-Suffix entfernen; die SPA skaliert Bilder per CSS responsiv.

**Basis-URL je nach `image_source`-Frontmatter:**

- Wenn `image_source: legacy` → `https://joerg-lohrer.de/<YYYY>/<MM>/<DD>/<dtag>.html/<encoded-filename>`
  - `YYYY/MM/DD` aus `date:`-Frontmatter, nicht aus dem Signatur-Zeitpunkt.
  - `<dtag>` ist identisch mit `slug`.
- Wenn `image_source` fehlt oder `image_source: blossom` → Blossom-URL; siehe Abschnitt 5.

### 4.3 `image_source`-Flag

**Einmaliger Migrationsschritt (vor erstem Publish-Lauf):** Die 18 Altposts bekommen `image_source: legacy` ins Frontmatter geschrieben. Das ist ein separater Commit, kein Pipeline-Feature.

**Neue Posts:** kein Flag nötig, Default = `blossom`. Wenn ein zukünftiger Post explizit auf All-Inkl zeigen soll (außergewöhnlich), kann `image_source: legacy` gesetzt werden.

### 4.4 Cover-Image-Tag

Das `image`-Tag im Event (für Listen-Previews/OG-Vorschau in Nostr-Clients) kommt aus dem Frontmatter (nicht aus dem Markdown-Body):

- Quelle: `cover.image:` (Hugo-Page-Bundle-Konvention); Fallback `image:` auf Top-Level.
- Ist typischerweise ein relativer Dateiname.
- Wird durch denselben URL-Bauer wie die Body-Bilder geschickt (Abschnitt 4.2), aber der Input ist ein direkter Dateiname aus YAML, nicht aus Markdown-Syntax. Keine `=WxH`-Suffix-Erkennung nötig.
- Ergebnis: absolute URL gemäß `image_source`-Policy.

---

## 5. Upload-Pfade

### 5.1 Legacy-Upload (All-Inkl)

Betrifft: die 18 Altposts, Bilder darin.

**Mechanik:** `rsync` over SSH via `Deno.Command("rsync", [...])`.

**Befehlsschema:**

```
rsync -avz --no-perms --no-times \
  -e "ssh -i $DEPLOY_KEY_PATH -o StrictHostKeyChecking=accept-new" \
  <post-folder>/*.{png,jpg,jpeg,gif,webp,svg} \
  $ALLINKL_DEPLOY_ROOT<YYYY>/<MM>/<DD>/<dtag>.html/
```

- **Idempotent:** rsync überträgt nur neue/geänderte Dateien.
- **Nicht-löschend:** ohne `--delete`. Alte Bilder bleiben auf dem Server liegen, keine automatische Bereinigung. Manueller Aufräum-Bedarf wird hingenommen (Tote Dateien verursachen keinen Schaden, Storage ist billig).
- **Zielordner erzeugen:** rsync legt fehlende Ordner per `--mkpath` oder (wenn Version zu alt) per vorgeschaltetem `ssh ... mkdir -p` an.

**Neuer Post-Edit mit alten Bildern:** falls jemand mal einen Post editiert, der `image_source: legacy` hat und neue Bilder hinzufügt → diese werden auch zu All-Inkl geschoben. Das ist okay. Das Flag steuert nur den URL-Basispfad, nicht die Intention „nie wieder All-Inkl".

### 5.2 Blossom-Upload

Betrifft: alle neuen Posts (`image_source: blossom` oder fehlend).

**Mechanik:** BUD-01 HTTP-Upload zu allen Servern aus `kind:10063`-Liste, parallel.

**Schritte pro Bild:**

1. SHA256-Hash der Datei berechnen.
2. Authorization-Event (`kind:24242`) bauen und via Bunker signieren (enthält Hash, Verb `upload`, Expiration).
3. HTTP `PUT /upload` gegen alle Server gleichzeitig mit Auth-Header `Nostr <base64-signed-event>`.
4. Antworten sammeln: pro Server entweder `200 { url, sha256, ... }` oder Fehler.
5. Erfolg: mindestens 1 Server hat die Datei akzeptiert. Optimal: alle.
6. Markdown-URL nutzt die URL des **ersten Servers** aus der `kind:10063`-Liste (deterministisch, reproduzierbar).

**Failure-Modi:**
- Alle Server lehnen ab → harter Fehler, Pipeline bricht für diesen Post ab.
- Manche Server OK, manche Fehler → Warnung in Log, Pipeline fährt fort mit erfolgreichem Upload.

**Retry:** 2 Versuche pro Server mit exponentiellem Backoff.

---

## 6. Change-Detection und Workflow

### 6.1 Welche Posts werden publiziert?

**Modus 1 — Git-Diff (Standard):**

Pipeline vergleicht Dateiliste zwischen `HEAD~1` (lokal) bzw. `${{ github.event.before }}` (CI) und `HEAD`. Alle `.md` in `content/posts/**/`, die darin als `A` (added), `M` (modified) oder `R` (renamed) auftauchen, werden publiziert.

**Modus 2 — `--force-all` (Migration / Reimport):**

Alle `content/posts/**/*.md` werden publiziert, unabhängig von Git-Diff. Verwendet für:
- Initiale Migration der 18 Altposts (einmaliger lokaler Lauf).
- Nachträgliches Reimport nach Schema-Änderungen.

**Modus 3 — `--post <slug>` (Einzel-Post, für Debug):**

Nur der Post mit dem angegebenen Slug wird verarbeitet.

### 6.2 Trigger

**Lokal:** `deno task publish [--force-all | --post <slug> | --dry-run]`.

**GitHub Action:**

```yaml
on:
  push:
    branches: [main]
    paths: ['content/posts/**']
  workflow_dispatch:
    inputs:
      force_all:
        type: boolean
        default: false
```

- Push auf `main` mit Content-Änderung → automatischer Publish im Git-Diff-Modus.
- Manual-Trigger via GitHub-UI → optional `force_all=true`, dann `--force-all`-Lauf.

### 6.3 Idempotenz und Doppelpublikationen

Bei ausschließlicher Nutzung einer Variante (nur lokal ODER nur CI) ist Git-Diff-Detection präzise.

**Edge Case:** Wenn du lokal einen Post publisht, *ohne* zu pushen, und später CI läuft (z. B. für eine Content-Änderung an einem anderen Post), bekommt CI keinen Diff für den schon-lokal-publizierten Post — keine Doppelpublikation. Wenn du *pushst*, sieht CI im Diff die Änderung und publisht den Post erneut (dank replaceable-Semantik ist das funktional harmlos, nur etwas Relay-Bandbreite-Waste).

**Akzeptable Redundanz.** Spec dokumentiert es, aber keine aktive Mitigation.

### 6.4 Updates bestehender Posts

Ein Edit eines bereits publizierten Posts führt zu einem neuen `kind:30023`-Event mit:
- Selbem `d`-Tag, selbem `pubkey`, selbem `kind` → ersetzt das alte Event (Replaceable-Semantik).
- Selbem `published_at` (Datum aus Frontmatter, unverändert).
- Neuem `created_at` (Signaturzeit).
- Geändertem `content` und ggf. Tags.

Die Pipeline loggt explizit „**UPDATE**" vs. „**NEU**", indem sie vor dem Publish das Relay befragt, ob bereits ein Event für `(pubkey, kind, dtag)` existiert. Rein informativ; beide Pfade nutzen denselben Code.

---

## 7. Fehlerbehandlung und Retries

### 7.1 Relay-Publish

Pro Post wird das signierte Event an alle Relays aus der `kind:10002`-Liste parallel geschickt. Pro Relay:

- Bis zu 2 Retries mit exponentiellem Backoff (1s, 3s).
- Erfolg = Relay antwortet mit `OK true`.
- Timeout pro Versuch: 10 Sekunden.

**Erfolgskriterium pro Post:** mindestens 2 von 4 Relays haben bestätigt. Weniger → harter Fehler, Post wird als „failed" markiert, Pipeline fährt mit nächstem Post fort, am Ende Exit-Code != 0.

**Log pro Relay:** Status (OK / fail / timeout), Roundtrip-Zeit.

### 7.2 Blossom-Upload

Siehe Abschnitt 5.2. Pro Server 2 Retries, mindestens 1 Server muss akzeptieren.

### 7.3 Legacy-Upload

rsync-Aufruf wird bei Exit-Code != 0 einmal wiederholt (1 Retry, 3 s Pause). Bleibt der Aufruf fehlerhaft, wird der Post als failed markiert und die Pipeline fährt mit dem nächsten fort.

### 7.4 Bunker-Signing

- Timeout 30 Sekunden pro Signatur-Request (Handy-Wake-up berücksichtigen).
- 1 Retry bei Timeout.
- Fehler (Permission denied, Bunker offline) → harter Abbruch der gesamten Pipeline (ohne Signaturen geht nichts).

### 7.5 Logging

Pipeline schreibt pro Run ein strukturiertes JSON-Log:

```json
{
  "run_id": "<uuid>",
  "started_at": "<iso>",
  "mode": "diff | force-all | post-single",
  "posts": [
    {
      "slug": "offenheit-das-wesentliche",
      "status": "success | failed | skipped-draft",
      "action": "new | update",
      "event_id": "<64-hex>",
      "relays_ok": ["wss://..."],
      "relays_failed": [],
      "blossom_servers_ok": [],
      "images_uploaded": 3,
      "duration_ms": 1234
    }
  ],
  "ended_at": "<iso>",
  "exit_code": 0
}
```

- **stdout:** in menschenlesbarer Form gedruckt.
- **CI:** zusätzlich als Artefakt `publish-log.json` hochgeladen (30 Tage Retention). Keine Repo-Commits zurück.
- **Lokal:** zusätzlich in `./logs/publish-<timestamp>.json` (lokal in `.gitignore`).

---

## 8. Modul- und Dateistruktur

```
publish/
├── deno.jsonc                    # Imports, Tasks, Permissions
├── .env.example                  # Dokumentation (Commit), keine Werte
├── .gitignore                    # .env, logs/
├── README.md                     # Quickstart
├── src/
│   ├── cli.ts                    # CLI-Entrypoint (mit `@std/cli`)
│   ├── core/
│   │   ├── config.ts             # BOOTSTRAP_RELAY, AUTHOR_PUBKEY_HEX
│   │   ├── frontmatter.ts        # parseFrontmatter(md): { fm, body }
│   │   ├── validation.ts         # validateSlug, validatePost
│   │   ├── markdown.ts           # transformImageUrls, stripSizeHints
│   │   ├── event.ts              # buildKind30023(fm, body)
│   │   ├── signer.ts             # NIP-46 Bunker-Wrapper
│   │   ├── relays.ts             # loadOutboxRelays, publishEvent
│   │   ├── blossom.ts            # loadServerList, uploadBlob
│   │   ├── legacy-upload.ts      # rsync SSH wrapper
│   │   ├── change-detection.ts   # gitDiff, allPostFiles, forceMode
│   │   └── log.ts                # structured logger + JSON writer
│   └── subcommands/
│       ├── publish.ts            # Hauptbefehl, alle 3 Modi inkl. --dry-run
│       ├── check.ts              # Pre-Flight-Validation
│       └── validate-post.ts      # Einzel-Post-Check ohne Upload (nur Frontmatter/Bilder)
├── tests/
│   ├── frontmatter_test.ts
│   ├── validation_test.ts
│   ├── markdown_test.ts
│   ├── event_test.ts
│   ├── change-detection_test.ts
│   └── fixtures/
│       └── sample-post.md
└── .github/
    └── workflows/
        └── publish.yml           # CI-Workflow
```

**Tests:** Deno-Standard-Test-Runner. Fokus auf Unit-Tests für pure Transformationen (frontmatter, markdown, event-bauen); Integration-Tests mit Mock-Relay und Mock-Bunker.

---

## 9. Testing-Strategie

### 9.1 Unit-Tests

- `parseFrontmatter`: diverse Real-Beispiele aus den 18 Altposts, Edge Cases (Leerzeichen in Strings, YAML-Blocks).
- `validateSlug`: Regex-Matching-Grenzen.
- `transformImageUrls`: alle Markdown-Bild-Muster, Leerzeichen in Dateinamen, bereits absolute URLs.
- `buildKind30023`: Frontmatter → Event-Objekt, Tag-Mapping, draft-Behandlung.
- `gitDiff`: Mock `git` subprocess.

### 9.2 Integration-Tests

- Mock-Relay (`jsr:@welshman/relay-mock` oder einfacher in-memory WebSocket-Mock).
- Mock-Bunker: Test-Signer mit bekanntem Key.
- Full-Flow: Sample-Post → signieren → publish gegen Mock-Relay → Event vom Mock abrufen → Inhalt vergleichen.

### 9.3 End-to-End (manuell, einmalig)

- Auf Testnetz: Dedicated Test-Relay, Test-Pubkey, Test-Amber-Account.
- Einen Sample-Post durchschieben, in Habla.news verifizieren.

### 9.4 Pre-Flight-Check als Test

`deno task check` wird auch von CI vor jedem Publish-Run ausgeführt. Failed Check → Pipeline bricht ab bevor irgendwas publiziert wird.

---

## 10. GitHub-Actions-Workflow

```yaml
name: Publish Nostr Events

on:
  push:
    branches: [main]
    paths: ['content/posts/**']
  workflow_dispatch:
    inputs:
      force_all:
        type: boolean
        default: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # für git-diff

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Setup SSH-Deploy-Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan ssh.all-inkl.com >> ~/.ssh/known_hosts

      - name: Pre-Flight Check
        env:
          BUNKER_URL: ${{ secrets.BUNKER_URL }}
          ALLINKL_DEPLOY_ROOT: ${{ secrets.ALLINKL_DEPLOY_ROOT }}
          AUTHOR_PUBKEY_HEX: ${{ secrets.AUTHOR_PUBKEY_HEX }}
        run: deno task check

      - name: Publish
        env:
          BUNKER_URL: ${{ secrets.BUNKER_URL }}
          ALLINKL_DEPLOY_ROOT: ${{ secrets.ALLINKL_DEPLOY_ROOT }}
          AUTHOR_PUBKEY_HEX: ${{ secrets.AUTHOR_PUBKEY_HEX }}
          GITHUB_EVENT_BEFORE: ${{ github.event.before }}
        run: |
          if [ "${{ inputs.force_all }}" = "true" ]; then
            deno task publish --force-all
          else
            deno task publish
          fi

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: publish-log
          path: ./logs/publish-*.json
          retention-days: 30
```

---

## 11. Beziehung zur SPA-Spec

Diese Publish-Pipeline und die SPA sind komplementär, aber voneinander entkoppelt:

**Gemeinsame Verträge** (normativ festgelegt in dieser Spec, Abschnitt 3):

- `kind:30023` Event-Schema — Publish produziert, SPA konsumiert.
- `kind:10002` Relay-Liste — Publish liest, SPA liest.
- `kind:10063` Blossom-Liste — Publish liest beim Upload, SPA liest für Bild-Fallback (zukünftig).
- Bild-URL-Konvention für Altposts `/YYYY/MM/DD/<dtag>.html/<file>` — Publish schreibt, SPA erwartet.

**Unabhängige Entwicklung möglich:**

- Publish kann gegen Mock-Relay und Mock-Bunker entwickelt und getestet werden, ohne dass die SPA existiert.
- SPA kann gegen manuell via `nak` o. ä. geschriebene Test-Events entwickelt werden, ohne dass die Publish-Pipeline existiert.

**Abhängigkeit beim Cutover (SPA-Migrationsschritte C + D):**

- SPA kann erst live gehen, wenn die 18 Altposts als Events auf Relays liegen.
- **Schritt C** der SPA-Migration bedeutet konkret: einmaliger lokaler Lauf `deno task publish --force-all` mit dem vollständigen Altbestand. Dieser Schritt liegt zeitlich **vor** Schritt D (dem tatsächlichen Cutover auf All-Inkl).
- Voraussetzung ist, dass die Publish-Pipeline zu diesem Zeitpunkt vollständig implementiert und durch `deno task check` validiert ist.

**Laufender Betrieb:**

- Neue Posts: Markdown committen, CI triggert Publish.
- SPA zeigt neuen Post beim nächsten Seitenreload an (Relay-Abfrage ist live).
- Zwei unabhängige Deploy-Zyklen (Publish bei Content-Änderung, SPA-Bundle bei Code-Änderung) ohne Kopplung.

---

## 12. Risiken und Mitigationen

| Risiko | Wahrsch. | Auswirkung | Mitigation |
|---|---|---|---|
| Amber offline während CI | mittel | hoch (Pipeline bricht ab) | Clear Error; Nutzer retriggert manuell nachdem Handy verfügbar |
| Bunker-Secret leakt (Repo-Secret) | niedrig | mittel | Secret rotierbar: in Amber Pairing löschen, neu pairen, Secret aktualisieren |
| SSH-Deploy-Key leakt | niedrig | mittel | Dedicated Key, in All-Inkl-KAS revokebar |
| `kind:10002` versehentlich überschrieben (Relay-Liste leer) | niedrig | hoch | check-Subcommand prüft vor jedem Run; Pipeline bricht bei leerer Liste ab |
| Relay-Zensur (Events werden gelöscht) | niedrig | mittel | Multi-Relay-Push; zusätzlich bezahltes nostr.wine als Durability-Anker |
| Git-Diff übersieht Post (Rebase, Force-Push) | niedrig | niedrig | `--force-all` als Fallback, dokumentiert |
| Blossom-Server löscht Bild | mittel | mittel | Multi-Upload zu mehreren Servern sobald kind:10063 erweitert ist |
| `encodeURIComponent` vs. All-Inkl Apache: URL-Matching fällt auseinander | niedrig | mittel | Tests gegen reale URLs; Normalisierungs-Regel (lowercase Slugs, ASCII-Filenames bevorzugt) |
| Privater Schlüssel-Recovery | niedrig | **katastrophal** | Amber hat Backup-Mechanismus; `nsec` zusätzlich offline auf Hardware sichern |

---

## 13. Evolutionspfad

**Jetzt (Bunker-Stufe Amber, Phase 1 Blossom):**
- Handy mit Amber als einziger Signer, online während Publish-Runs.
- Ein Blossom-Server in `kind:10063` (primal).
- Legacy-Bilder auf All-Inkl für die 18 Altposts.
- Relay-Liste mit 4 Public-Relays.

**Bunker-Stufe Optiplex (sobald Proxmox-Container läuft):**
- Self-hosted Bunker (z. B. `nak bunker` als Container), 24/7 online.
- Connection-URL im Secret rotieren; Amber bleibt als Backup/manueller Signer.
- Keine Code-Änderung in der Pipeline.

**Phase 5 Blossom (eigener Blossom-Server auf Optiplex):**
- Zusätzlicher `server`-Tag in `kind:10063` (`https://blossom.joerg-lohrer.de`).
- Neue Posts werden automatisch auch dorthin hochgeladen (Multi-Upload).
- Markdown-URL zeigt auf Primär-Server (= erster Eintrag in Liste). Soll das der eigene sein: Liste entsprechend ordnen.

**Optional später:**
- `deno task mirror` — Subcommand, der bestehende Bilder (z. B. vom ersten Server) auch zu später hinzugefügten Servern spiegelt. Hilft bei Blossom-Server-Wechsel.

---

## 14. Success-Kriterien Phase 1

- `deno task check` ohne Fehler.
- 18 Altposts via einmaligem `deno task publish --force-all` publiziert.
- Jeder Post in mindestens 2 Public-Relays abrufbar, in Habla.news korrekt gerendert.
- Bilder der 18 Posts via `/YYYY/MM/DD/<dtag>.html/<bildname>` auf All-Inkl erreichbar.
- Ein neuer Test-Post via CI auf `main`-Push publiziert in unter 90 Sekunden ab Push.
- `publish-log.json` enthält aussagekräftige Einträge pro Post.
- Pipeline läuft ohne nsec-Exposition in irgendeiner Umgebung.

---

## Anhang: Begriffe

- **NIP-23:** Nostr-Langform-Events, `kind:30023`, replaceable per `d`-Tag.
- **NIP-46:** Nostr-Remote-Signer-Protokoll (Bunker). Signatur-Anfrage und -Antwort verschlüsselt über Relays.
- **NIP-65:** Outbox-Model, `kind:10002`, definiert Read/Write-Relays pro Autor.
- **BUD-01:** Blossom-Upload-Definition: `PUT /upload` mit Nostr-Auth-Header.
- **BUD-03:** Blossom-User-Description-03, `kind:10063` mit Server-Liste.
- **Amber:** Android-App, die als NIP-46-Signer fungiert.
- **Replaceable Event:** Ersetzt vorherige Events mit gleichem `(pubkey, kind, d)`-Tupel auf dem Relay.
