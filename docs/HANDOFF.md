# Handoff — Nächste Session

Du (Claude, nächste Session) oder ich (Jörg, später) kommen hier zurück.
Dieses Dokument sagt: was ist der Zustand, was wartet, wo liegen die Fäden.

## Zustand (Details in `STATUS.md`)

**Cutover am 2026-04-18 abgeschlossen.** `joerg-lohrer.de` läuft als
SvelteKit-SPA, rendert 18 Nostr-Langform-Posts live aus 5 Relays, Bilder
auf 2 Blossom-Servern. Hugo-Altbestand liegt als `hugo-archive`-Branch
eingefroren.

Der Rest sind Feinschliff-Aufgaben.

## Was als Nächstes ansteht (priorisiert)

### Option A — Repo/Nostr-Konflikt-Management (priorisiert)

**Warum jetzt:** Es gibt **9 Langform-Events auf Nostr, die keine
Markdown-Entsprechung im Repo haben** — alle via Client (Habla / Yakihonne)
direkt auf Nostr erstellt, zum Teil mit problematischen d-tags (Emojis,
Doppelpunkte, Umlaute, Trailing-Dashes, oder leer).

**Liste der verwaisten Nostr-Events** (d-tag → event-id-Prefix):

| d-tag | event-id | Probleme |
|---|---|---|
| `richter-oder-rcher-banksy-als-moderner-prophet-vor-dem-high-court` | `bb2c2cea…` | Umlaut-Abdecker (`Rächer` → `rcher`) |
| `die-kraft-der-gemeinschaft-wahre-strke-liegt-nicht-in-strukturen-sondern-in-prozessen` | `27d7fbee…` | Umlaut-Abdecker (`Stärke` → `strke`) |
| `nostr-und-open-educational-practices-oep-` | `0baa3615…` | Trailing-Dash, unschön |
| `religionsbezogene-bildung-mit-rollenkarten:-ki-bilder-als-impulsgeber` | `3ac719ca…` | `:` ungültig für URL-Slug |
| `📢-empowering-learners-for-the-age-of-ai-–-der-neue-review-draft-des-ai-literacy-frameworks-für-schule-ist-da!` | `3c005996…` | Emoji + `!` + Umlaute + extrem lang |
| `🟠-prompts-für-die-religionsbezogene-bildung-posten-und-diskutieren-auf-nostr` | `f726fcd5…` | Emoji + Umlaute |
| `ki-mitmachen` | `a1368d2e…` | sauber, aber fehlt im Repo |
| `bibel-selfies` | `00cbe5f3…` | Langform-Version; Duplikat mit Unix-Timestamp wurde bereits gelöscht |
| `""` (leer!) | `d75857dc…` | leerer d-tag — SPA-kritisch, Event hat keinen Slug |

**Zielbild:** Repo ist die Quelle der Wahrheit. Jeder Post existiert als
Markdown mit sauberem Slug. d-tags sind URL-freundlich (ASCII, keine
Sonderzeichen außer `-`).

**Empfohlener Flow (Reihenfolge nicht tauschen!):**

1. **Content exportieren.** Pro Event: `nak req -i <event-id> <relay>` →
   JSON mit Content + Tags. Manuell in neue Markdown-Datei umwandeln
   (`content/posts/<YYYY-MM-DD>-<saubererslug>/index.md`). Titel,
   published_at, ggf. summary und bestehende image-Tags übernehmen.
   Bilder nach `images/` kopieren (falls noch erreichbar), sonst
   Blossom-URLs im Markdown belassen und beim Publish neu hashen.
2. **Slugs bereinigen.** Neue, saubere, ASCII-only d-tags wählen. Doku
   in `docs/redaktion-bild-metadaten.md` oder einem neuen
   `docs/nostr-reimport-mapping.md` festhalten (alter d-tag → neuer slug).
3. **Neu publizieren.** `deno task publish --post <slug>` pro Datei.
   Pipeline hasht Bilder zu Blossom, signiert mit stabiler Identität.
4. **Alte Events löschen** via NIP-09 (`kind:5`). Heute noch manuell per
   `nak event -k 5 -t e=<old-event-id>`, siehe Option D. Oder: erst
   Option D bauen, dann diesen Schritt per Pipeline-Subcommand.
5. **Verifikation.** Post-Count pro Relay checken, SPA-Post-Liste
   visuell prüfen.

**Edge Cases:**
- Das leere-d-tag-Event (`d75857dc…`): wenn es noch sinnvoller Content
  ist, als neuer Post re-importieren. Sonst einfach löschen.
- Bilder in alten Events zeigen auf externe Server (nicht Blossom). Beim
  Re-Publish lädt die Pipeline sie herunter und hasht sie neu. Wenn die
  Quelle tot ist, muss das Bild manuell beschafft oder der Post mit
  Platzhalter markiert werden.
- `relay.damus.io` liefert mehr Events als andere Relays — bei
  Nicht-Auffindbarkeit auf anderen Relays trotzdem löschen, damus.io
  respektiert den NIP-09.

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

### Option D — NIP-09-Delete als Pipeline-Subcommand

**Status:** heute einmalig per `nak event -k 5 …` mit neu erzeugter Bunker-
URL erledigt (Duplikat `1744905463975`). Das war ein Workaround um das
„already connected"-Problem unserer Pipeline-Signer-Wiederverwendung.

**Zu tun:** in `publish/src/subcommands/` einen `delete`-Subcommand bauen,
der NIP-09 sauber erledigt und unsere stabile Signer-Identität nutzt.

```
deno task publish-delete --slug <slug>
# oder
deno task publish-delete --event-id <hex>
```

**Sinnvollerweise mit Option A kombinieren** — in der Re-Import-Kampagne
werden 9 NIP-09 hintereinander gebraucht.

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

- Parallax-Effekte, Animations
- Dark-Mode-Feinschliff (aktuell `prefers-color-scheme`, könnte Toggle bekommen)
- Typografie-Experimente (Variable Fonts?)
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
  nak req -k 30023 -a 4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41 wss://relay.edufeed.org 2>/dev/null | jq -s 'length'
  ```
- Pipeline-Tests: `cd publish && deno task test`

## Community-Wiki-Entwürfe

Liegen im Repo, noch nicht extern veröffentlicht:
- `docs/wiki-entwurf-nostr-bild-metadaten.md` — DE
- `docs/wiki-draft-nostr-image-metadata.md` — EN

Können als NIP-Proposal oder auf nostrbook.dev eingebracht werden, jetzt wo
die Konvention in der Praxis validiert ist.
