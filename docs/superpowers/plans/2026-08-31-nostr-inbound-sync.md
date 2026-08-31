# Plan: Inbound-Sync — Nostr-native Posts im Blog und im Repo

> **Stand 2026-08-31:** Phase 1 umgesetzt und gepusht (`bcd3585`), aber
> **noch nicht deployt** — die Live-Seite läuft weiter mit dem alten
> Snapshot. Phase 2 offen.
> Auslöser: `protocol-anthropology` (naddr…70xst) erschien in der Übersicht,
> lieferte unter `/protocol-anthropology/` aber 404.

## Nächster Schritt

GitHub → Actions → **Build + Deploy SPA** → *Run workflow* mit `target: prod`.
Vorher die 30–90 s des Forgejo→GitHub-Mirrors abwarten, sonst baut die Action
gegen den alten Commit.

Kontrolle danach:

```sh
curl -s https://joerg-lohrer.de/protocol-anthropology/ | grep -o "<title>[^<]*</title>"
```

Erwartet: `The Theological Anthropology Built Into the Protocol – Jörg Lohrer`.
Kommt weiterhin nur `Jörg Lohrer`, lief der Build gegen den alten Stand.

## Problem

Zwei getrennte Befunde, die zusammen den 404 erzeugen:

**A — Relay-Abdeckung.** `snapshot/src/core/relays.ts` fragt die NIP-65-Liste
ab (`loadReadRelays`) und fällt nur dann auf `FALLBACK_READ_RELAYS` zurück,
wenn gar kein kind:10002 kommt. Gemessen am 2026-08-31:

| Relay | kind:30023 | `protocol-anthropology` |
|---|---|---|
| relay.primal.net | 1 | ja |
| nos.lol | 27 | nein |
| relay.tchncs.de | 27 | nein |
| relay.damus.io | 0 | nein |
| relay.edufeed.org | 0 | nein |
| relay.plebstr.com | 0 | nein |

Das Event liegt nur auf *einem* Relay, und dieses Relay liefert umgekehrt die
anderen 27 Posts nicht. Je nachdem, welche Liste greift, fehlt entweder der
neue Post oder fast alle alten.

Erschwerend: die NIP-65-Liste (2026-04-24) nennt `wss://primal.net` und
`wss://relay-rpi.edufeed.org`, der Code-Fallback dagegen `wss://relay.primal.net`
und `wss://relay.edufeed.org` — verschiedene Hosts, nicht nur Schreibweisen.

**B — kein Rückweg Nostr → Repo.** Der Snapshot baut `PostJson` allein aus dem
Event (`buildPostJson`), das Repo bleibt außen vor. Ein extern (Habla/Ditto)
verfasster Post existiert daher nie als `.md` und fehlt im Repo-Archiv.

**Nicht das Problem:** Die Annahme „der Code kennt nur Markdown aus dem Repo"
trifft für den Build-Pfad nicht zu. `snapshot/src/cli.ts` liest ausschließlich
von Relays. Läge das Event auf `nos.lol`, wäre die Seite ohne jedes `.md`
gebaut worden. Der Nostr-first-Pfad existiert bereits — er ist an der
Relay-Abdeckung gescheitert.

## Ziel

1. Nostr-native Longform-Posts erscheinen automatisch im Blog (Phase 1).
2. Sie landen zusätzlich als `.md` im Repo — über einen PR, nicht per
   Direkt-Commit (Phase 2).

## Phase 1 — Relay-Union (behebt den 404) — ERLEDIGT (`bcd3585`)

### 1.1 `loadReadRelays` auf Vereinigungsmenge umstellen

`snapshot/src/core/relays.ts`: statt „NIP-65 *oder* Fallback" künftig
„NIP-65 *und* Fallback", dedupliziert.

- Neue Funktion `normalizeRelayUrl(url)`: Trailing-Slash weg, lowercase,
  Schema erhalten. Verhindert, dass `wss://nos.lol/` und `wss://nos.lol`
  als zwei Relays zählen.
- `loadReadRelays` gibt `[...new Set([...nip65, ...fallback].map(normalize))]`
  zurück.
- `FALLBACK_READ_RELAYS` um die Host-Varianten aus der echten NIP-65-Liste
  ergänzen: `wss://primal.net`, `wss://relay-rpi.edufeed.org`.

Damit wäre `protocol-anthropology` gefunden worden.

### 1.2 Quorum-Check an die größere Liste anpassen

`runChecks` verlangt 60 % Relay-Antworten. Bei größerer Liste mit mehreren
toten Relays (damus, edufeed und plebstr lieferten 0) kippt das in
False-Positive-Hard-Fails.

Wichtige Unterscheidung: „hat geantwortet" ≠ „hat Events geliefert". Der
aktuelle `fetcher` resolved auch bei Timeout mit leerem Array, zählt also
als `ok`. Das Quorum misst damit Erreichbarkeit, nicht Vollständigkeit.

- Quorum auf absolute Untergrenze umstellen: mindestens 2 Relays *mit
  Events*, statt 60 % Antwortende. Genauer am Schutzziel.
- `eventCount`- und Drop-Check bleiben unverändert — die sind der eigentliche
  Datenverlust-Schutz und haben hier gut funktioniert.

### 1.3 Tests

`snapshot/tests/relays.test.ts`:
- Union enthält NIP-65- *und* Fallback-Einträge.
- Normalisierung: `wss://nos.lol/` und `wss://nos.lol` → ein Eintrag.
- Leere NIP-65-Antwort → reine Fallback-Liste (Regression).

`snapshot/tests/checks.test.ts`:
- Viele tote Relays + 2 mit Events → kein Fail.
- 1 Relay mit Events → Fail.

### 1.4 Verifikation — durchgeführt

`deno task snapshot` lokal:

```
snapshot: 7/7 relays geantwortet, 5 davon mit events, 146 events roh
snapshot: ohne events = wss://relay.primal.net, wss://primal.net
snapshot: 28 posts geschrieben
```

28 statt 27 Posts, `protocol-anthropology.json` vorhanden. `npm run build`
erzeugt `build/protocol-anthropology/index.html` mit korrektem Titel und
Inhalt. 36 Tests grün.

Zusätzlich implementiert (nicht im Entwurf vorgesehen): `fetchEvents` liefert
jetzt `withEvents` neben `responded`, und die CLI loggt, welche Relays stumm
blieben. Ohne diese Trennung ließe sich das neue Quorum nicht berechnen.

**Erwartung, die sich nicht bestätigt hat:** Der Entwurf nahm an, auch
`warum-dein-ki-gedaechtnis-luegen-muss` würde erscheinen. Tut er nicht — der
Post ist committet (`dcabc5f`), liegt aber auf keinem Relay. Die zugehörigen
Bilder sind noch untracked, die Publish-Action dürfte deshalb nicht
durchgelaufen sein. Das ist der Outbound-Pfad und von diesem Plan unberührt.

## Phase 2 — Rückschreibung als PR

### 2.1 Neuer Subcommand `sync-inbound`

Neu: `publish/src/subcommands/sync-inbound.ts`. Bewusst in `publish/`, nicht
in `snapshot/` — dort liegen `frontmatter.ts`, `markdown.ts` und das
Frontmatter-Schema, das wir bedienen müssen.

Ablauf:
1. `snapshot/output/index.json` lesen (läuft nach dem Snapshot).
2. Pro Post prüfen, ob `content/posts/<lang>/<slug>/index.md` existiert.
   Achtung: der Ordnername im Repo trägt ein Datums-Präfix
   (`2025-09-09-banksy-high-court-prophet`), der Nostr-`d`-Tag nicht
   (`banksy-high-court-prophet`). Matching muss über den `slug:`-Wert im
   Frontmatter laufen, nicht über den Ordnernamen — sonst wird jeder
   bestehende Post als „fehlend" erkannt.
3. Für fehlende: `index.md` erzeugen aus `PostJson`.
4. Liste der neu erzeugten Pfade als JSON auf stdout (für die Action).

### 2.2 Frontmatter-Rückabbildung

Aus `PostJson` → Frontmatter (Gegenstück zu `buildKind30023`):

| Frontmatter | Quelle |
|---|---|
| `title` | `title` |
| `slug` | `slug` (der `d`-Tag — muss exakt erhalten bleiben) |
| `date` | `published_at` → `YYYY-MM-DD` |
| `description` | `summary` |
| `image` | `cover_image.url` |
| `tags` | `tags` |
| `lang` | `lang` |
| `a` | aus `translations` rekonstruiert |

Zusätzlich ein Marker, der die Herkunft festhält:

```yaml
source: nostr
source_event_id: 8a16dea…
```

Der Marker ist nicht Kosmetik — er ist die Loop-Bremse (siehe 2.4).

Ordnername: `<YYYY-MM-DD>-<slug>` aus `published_at`, konsistent zum Bestand.

**Bilder bleiben remote.** Der Post referenziert Blossom-URLs
(`blossom.ditto.pub/…`). Kein Download, keine `images:`-Metadatenblöcke —
die Konvention aus `2026-04-16-image-metadata-convention.md` verlangt
Lizenz- und Autor-Angaben, die im Event schlicht nicht stehen. Erfinden wäre
falsch. Stattdessen ein Kommentar im Frontmatter, dass die Metadaten für
extern verfasste Posts fehlen und bei Bedarf manuell zu ergänzen sind.

### 2.3 Workflow `sync-inbound.yml`

Trigger: `schedule` (täglich) + `workflow_dispatch`.

1. Checkout, Deno.
2. Snapshot laufen lassen (Phase 1 aktiv).
3. `deno run … src/cli.ts sync-inbound`.
4. Wenn nichts erzeugt → sauber beenden.
5. Sonst: Branch `nostr-sync/<datum>`, committen, PR gegen `main` per
   `peter-evans/create-pull-request` oder `gh pr create`.

PR-Body listet die importierten Posts mit naddr-Link.

### 2.4 Loop-Schutz — der kritische Punkt

`publish.yml` triggert auf `push` nach `content/posts/**`. Ein gemergter
Sync-PR feuert damit die Publish-Action, die das Event neu signiert und
publiziert — mit neuem `created_at`. Der nächste Snapshot sieht die neuere
Version, alles wandert eine Runde weiter. Kein Endlos-Loop (der Inhalt
konvergiert), aber jeder Merge überschreibt ein extern erstelltes Event mit
einer Neusignatur, und `dedupByDtag` bevorzugt das neuere — die
Original-Fassung aus dem Nostr-Editor verschwindet.

Absicherung, zwei Ebenen:

1. **In `publish.ts`**: Posts mit `source: nostr` im Frontmatter werden
   übersprungen, außer `--force-all`. Der Marker aus 2.2 trägt diese
   Entscheidung.
2. **Im Workflow**: `paths-ignore` allein reicht nicht, da der Sync-PR
   zwangsläufig unter `content/posts/**` landet. Ebene 1 ist die eigentliche
   Bremse; Ebene 2 wäre nur Redundanz.

Der Marker macht damit eine bewusste Aussage: *dieser Post wird von Nostr
verwaltet, das Repo ist Archiv.* Wer ihn aus dem Frontmatter entfernt,
übernimmt den Post ins Repo-Regime — ein sauberer, expliziter Übergabepunkt.

### 2.5 Tests

`publish/tests/sync-inbound.test.ts`:
- `PostJson` ohne Repo-Datei → Frontmatter korrekt, `source: nostr` gesetzt.
- Post mit vorhandenem `.md` (Datums-Präfix im Ordner!) → übersprungen.
- Round-Trip: erzeugtes Frontmatter durch `parseFrontmatter` → `buildKind30023`
  ergibt dieselben `d`/`title`/`published_at`/`t`-Tags wie das Ursprungsevent.
- `publish.ts` überspringt `source: nostr` ohne `--force-all`.

## Reihenfolge

Phase 1 ist erledigt, aber erst nach dem Deploy wirksam (siehe „Nächster
Schritt" oben). Phase 2 baut darauf auf und ist unabhängig testbar.
Empfehlung: erst deployen und den Effekt live prüfen, dann Phase 2.

## Offene Punkte

- **`lang: de` bei englischem Post.** `protocol-anthropology.json` trägt
  `lang: de`, obwohl der Text englisch ist: Der Nostr-Editor (Ditto) setzt
  kein `l`-Tag, und `buildPostJson` defaultet auf `de`. Wirkt sich auf
  `<html lang>`, `og:locale` und die Sprachumschaltung aus. Gehört inhaltlich
  zu Phase 2 (dort wird `lang` ins Frontmatter geschrieben), lässt sich aber
  vorziehen. Zu klären: raten (Heuristik über den Text) oder ohne `l`-Tag
  bewusst `unknown` führen — Raten kann bei zweisprachigen Posts falsch
  liegen.
- **Bootstrap-Relay liefert selbst keine Events.** `BOOTSTRAP_RELAY` ist
  `wss://relay.primal.net`; im Lauf vom 2026-08-31 stand es unter „ohne
  events", obwohl dieselbe URL in der Einzelmessung kurz zuvor das
  gesuchte Event lieferte. Für kind:10002 reicht es, erklärt aber die
  brüchige Abdeckung. Ein stabileres Bootstrap-Relay wäre zu erwägen.
- **Löschungen.** Wird ein Nostr-Post per kind:5 gelöscht, verschwindet er aus
  dem Snapshot, das `.md` bleibt. Vorschlag: zunächst bewusst so lassen (Repo
  = Archiv), im PR-Body vermerken.
- **Nachträgliche Edits.** Ein extern editierter Post erzeugt beim nächsten
  Sync keinen Diff, weil die Datei existiert. Ein `--update`-Modus, der
  `source: nostr`-Dateien neu schreibt, wäre die Erweiterung — bewusst nicht
  in Phase 2, um den ersten Durchstich klein zu halten.
- **Relay-Hygiene.** `relay.plebstr.com` steht an erster Stelle der
  NIP-65-Liste, liefert aber nichts. Unabhängig von diesem Plan wäre die
  kind:10002-Liste eine Aktualisierung wert.
- **`deno fmt` ist im Repo nicht durchgesetzt.** 11 von 20 Dateien unter
  `snapshot/` weichen ab, auch unberührte. Beim Arbeiten daher gezielt
  einzelne Dateien prüfen statt `deno fmt --check` über den Baum — sonst
  entstehen Diffs an Zeilen, die nichts mit der Änderung zu tun haben.

## Messdaten (2026-08-31, für spätere Vergleiche)

kind:30023-Events pro Relay, Autor `4fa5d1c4…`:

| Relay | Events | `protocol-anthropology` |
|---|---|---|
| relay.primal.net | 1 | ja |
| nos.lol | 27 | nein |
| relay.tchncs.de | 27 | nein |
| relay.damus.io | 0 | nein |
| relay.edufeed.org | 0 | nein |
| relay.plebstr.com | 0 | nein |

NIP-65-Liste (kind:10002 vom 2026-04-24): plebstr, nos.lol, nostr.wine,
nostr.bitcoiner.social, relay.nostr.band, nostr-pub.wellorder.net,
offchain.pub, purplepag.es, relay.damus.io, primal.net, relay-rpi.edufeed.org.
