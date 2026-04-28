# Konvention: Bild-Metadaten im Post-Frontmatter (Phase 1)

**Datum:** 2026-04-16
**Status:** Umgesetzt — Phase 1 (live seit 2026-04-18). Phase 2 (Caption-Rendering, Reverse-Routine, License-Katalog, strikte Validierung) ist offen.
**Scope:** YAML-Frontmatter-Schema für Bildmetadaten in Markdown-Posts. Wird von der Publish-Pipeline in `kind:30023`-Events (NIP-23) plus `imeta`-Tags (NIP-92) + `license`-Tag abgebildet.

## Ziele

1. **Sichere Attribution** — keine stille Fehlattribuierung. Fehlende Kenntnis wird explizit als `UNKNOWN` markiert, nie implizit geerbt.
2. **Menschlich lesbares, minimal-invasives YAML** — Defaults kommen aus Env, Frontmatter enthält nur das Abweichende.
3. **Blaupausen-Tauglichkeit** — funktioniert für beliebige Repos mit 1..n Autoren, Eigen- und Fremdbildern.
4. **Eine Datenstruktur pro Konzept** — Cover ist nur ein Bild mit Rolle. Kein paralleler Schema-Zweig.

---

## 1. Post-Ebene

```yaml
---
title: "Schokoschnecken"
slug: "jojos-schoko-zimt-schnecken"
date: 2023-02-26

# Lizenz des Post-TEXTES. Gilt NICHT automatisch für Bilder.
license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"

# Text-Autoren. Weglassen, wenn DEFAULT_AUTHORS aus Env gelten soll.
# Immer Array, auch bei einem Autor.
authors:
  - name: "Jörg Lohrer"
    url: "https://joerg-lohrer.de/"      # optional
    orcid: "..."                          # optional, frei erweiterbar
---
```

**Regeln:**

- `license` fehlt → Env-Default `DEFAULT_LICENSE` greift für den Text.
- `authors` fehlt → Env-Default `DEFAULT_AUTHORS` greift für den Text.
- **Diese Werte gelten ausschließlich für den Post-TEXT.** Für Bilder gibt es keine automatische Vererbung. Bilder haben eigene Lizenz- und Autor-Felder (siehe Abschnitt 2).

### 1.1 `date`

Erlaubtes Format: `YYYY-MM-DD` (wird als `00:00:00 UTC` interpretiert) oder ISO-8601 mit Uhrzeit (`YYYY-MM-DDTHH:MM:SSZ`). Zeitzone immer UTC, keine lokale TZ. Die Pipeline leitet daraus `published_at` (Unix-Sekunden) ab, stabil über Edits.

---

## 2. Bilder — einheitliche Liste

**Alle** Bilder eines Posts (Cover wie Body-Bilder) leben in einer einzigen `images`-Liste. Das Cover ist ein Bild mit `role: cover`.

```yaml
images:
  # Cover-Bild
  - file: cover.jpg
    role: cover
    alt: "Goldbraune Hefeschnecken auf Kuchenblech, frisch gebacken"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  # Body-Bild, eigenes Foto
  - file: Hefeteig-mit-Fuellung.jpg
    alt: "Hefeteig mit Kakao-Zimt-Zucker-Füllung, ausgerollt auf Backpapier"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  # Body-Bild, Herkunft unklar (Altpost, noch zu recherchieren)
  - file: altes-bild.jpg
    alt: "Screenshot der Startseite eines Lern-Portals"
    license: UNKNOWN
    authors: UNKNOWN

  # Body-Bild, Fremdbild mit vollen Angaben
  - file: fremdfoto.jpg
    alt: "Osterküken mit Osterei"
    authors:
      - name: "Vera Kratochvil"
    source_url: "https://www.publicdomainpictures.net/de/view-image.php?image=13188"
    license: "https://creativecommons.org/publicdomain/zero/1.0/"
    modifications: "beschnitten"       # optional (das B in TULLU-BA)
```

### 2.1 Feld-Referenz

| Feld | Pflicht | Wert | Semantik |
|---|---|---|---|
| `file` | ja | String | Dateiname relativ zum Post-Ordner. Datei muss existieren. |
| `role` | nein | `cover` | Genau ein Bild pro Post darf `role: cover` haben. Dessen URL landet im Event-`image`-Tag. Kein `role` → Body-Bild. |
| `alt` | ja | String | Accessibility-Beschreibung. Leerstring `""` ist erlaubt (Dekorationsbild), fehlendes Feld ist ein Validierungsfehler. |
| `caption` | nein | String | Optionaler menschlicher Kontext (z. B. „Teig vor dem Einrollen"). Wird in Phase 1 nur in `imeta` als `caption`-Feld eingetragen. |
| `license` | ja | URL \| `UNKNOWN` | Volle URL im schema.org-Stil **oder** `UNKNOWN` als expliziter Marker. Kein Inheritance. |
| `authors` | ja | Array \| `UNKNOWN` | Array von `{name, url?, orcid?, ...}` **oder** `UNKNOWN`. Kein Inheritance. |
| `source_url` | nein | URL | Originalquelle / Fundstelle des Bildes. |
| `modifications` | nein | String | Freitext-Beschreibung einer Bearbeitung („beschnitten", „Kontrast angehoben", …). |

### 2.2 `UNKNOWN`-Semantik

`UNKNOWN` ist ein **einzelner** sauberer Marker — kein leeres Feld, kein `null`, kein Weglassen. Nutzen:

- Pipeline schreibt das Feld **nicht** in den `imeta`-Tag.
- Pipeline **loggt eine Warnung** pro `UNKNOWN`-Vorkommen (mit Post-Slug + Dateiname) — dient als Recherche-Liste.
- In Phase 1 ist `STRICT_MODE` default `false`: Events werden trotzdem publiziert.
- In Phase 2 kann `STRICT_MODE=true` Events mit `UNKNOWN` blockieren.

### 2.3 Bilder im Body

Im Markdown-Body werden Bilder weiterhin schlicht referenziert:

```markdown
![](Hefeteig-mit-Fuellung.jpg)
```

oder (für Migration tolerant):

```markdown
![Hefeteig mit Füllung](Hefeteig-mit-Fuellung.jpg)
```

Der Alt-Text im Markdown ist **niedriger priorisiert** als `alt` aus `images[]`. Er dient nur als Fallback für Bilder, die nicht in `images[]` stehen.

**Reihenfolge:** `images[]` ist ein Metadaten-Lookup per `file`, **keine** Sequenz. Die YAML-Reihenfolge muss nicht der Body-Reihenfolge entsprechen. Die Pipeline sortiert für Log-Output alphabetisch nach `file`.

### 2.4 Body-Captions aus Altposts

Bestehende in-body-Captions (z. B. Lead-in-Sätze vor Bildern, italic-Attributionen nach Bildern) bleiben unberührt. Phase 1 injiziert **nichts** in den Body. Redundanz oder Entfernen ist eine Phase-2-Entscheidung.

---

## 3. Abbildung auf das Nostr-Event (kind:30023)

### 3.1 Pflicht- und Standard-Tags (NIP-23)

| Tag | Quelle |
|---|---|
| `["d", slug]` | Frontmatter `slug` |
| `["title", title]` | Frontmatter `title` |
| `["published_at", unix]` | Frontmatter `date` (stabil über Edits) |
| `["summary", ...]` | Frontmatter `description` |
| `["image", url]` | URL des Bildes mit `role: cover` nach Blossom-Upload |
| `["t", tag]` | je ein Eintrag aus Frontmatter `tags[]` |

### 3.2 Lizenz und Autoren (Post-Text-Ebene)

| Tag | Quelle |
|---|---|
| `["license", url]` | Post-`license` (einmal pro Event, nur für Text-Lizenz) |
| `["p", pubkey, relay-hint, role]` | optional, wenn Text-Autoren einen Nostr-Pubkey haben — Phase 2 |

Für Phase 1 wird **nur** der `license`-Tag des Post-Textes geschrieben.

### 3.3 `imeta`-Felder pro Bild (NIP-92 plus Extensions)

Pro hochgeladenem Bild ein Tag:

```
["imeta",
  "url <blossom-url>",
  "m <mime>",
  "x <sha256>",
  "alt <alt>",                 // nur wenn nicht leer
  "caption <caption>",         // nur wenn vorhanden
  "license <url>",             // nur wenn konkrete URL (nicht UNKNOWN)
  "author <name>",             // eins pro Autor, nur wenn konkret (nicht UNKNOWN)
  "source_url <url>",          // nur wenn vorhanden
  "modifications <text>"       // nur wenn vorhanden
]
```

**Regeln:**

- `url`, `m`, `x` sind Pflicht und kommen aus dem Blossom-Upload.
- `UNKNOWN`-Werte werden **weggelassen** (kein Feld im Tag).
- Leerer `alt` wird weggelassen.
- Mehrere Autoren → mehrere `author`-Einträge im selben Tag.

### 3.4 NIP-89 `client`-Tag

Wenn Env `CLIENT_TAG` gesetzt ist: `["client", "<name>"]`. Default leer → kein Tag. Opt-in für Blaupausen, die Provenance markieren wollen.

### 3.5 Referenzen (`a`, `e`) — Phase 2

Aus optionalem Frontmatter `references:` (Array von `nostr:naddr…` / `nostr:nevent…`) werden `a`/`e`-Tags dekodiert. In Phase 1 nicht implementiert.

### 3.6 Body-Caption-Injektion — Phase 2

Automatische Injektion menschenlesbarer Attribution unter jedes Bild im Event-`content`. In Phase 1 nicht implementiert — reine `imeta`-Tags reichen für NIP-23-konforme Clients. Ob/wie in Phase 2 gebaut, wird anhand konkreter Client-Lücken entschieden.

### 3.7 Reverse-Routine — Phase 2

Rekonstruktion von strukturierten `images[]`-Einträgen aus nacktem Markdown mit injizierten Captions. In Phase 1 nicht benötigt.

---

## 4. Env-Defaults (Blaupause)

| Env | Default | Zweck |
|---|---|---|
| `DEFAULT_LICENSE` | `https://creativecommons.org/publicdomain/zero/1.0/deed.de` | Post-Text-Lizenz, wenn Frontmatter `license` fehlt |
| `DEFAULT_AUTHORS` | `[]` | Post-Text-Autoren als JSON-Array `[{"name":"…"}]`, wenn Frontmatter `authors` fehlt |
| `CLIENT_TAG` | *(leer)* | NIP-89 client-Provenance, opt-in |
| `STRICT_MODE` | `false` | Phase 1: Warnungen statt Fehler bei `UNKNOWN`. Phase 2: kann auf `true` gesetzt werden |

**Wichtig:** Env-Defaults greifen nur für die **Post-Text-Lizenz und Post-Text-Autoren**. Sie greifen **nicht** für Bilder. Bilder brauchen explizite `license` und `authors` pro Eintrag (oder `UNKNOWN`).

---

## 5. Validierung (Phase 1 — minimal)

Der `validate-post`-Subcommand prüft:

1. Jedes Bild in `images[]` hat ein `alt`-Feld (Leerstring erlaubt, fehlendes Feld verboten).
2. Jeder `file`-Wert referenziert eine existierende Datei im Post-Ordner.
3. Jedes im Body mit `![](filename)` referenzierte Bild existiert als Datei.
4. Maximal ein Bild hat `role: cover`.

**Explizit NICHT geprüft in Phase 1:**

- `license` vorhanden oder well-formed (Env-Default für Text greift; Bilder dürfen `UNKNOWN` sein)
- `authors` vorhanden oder non-empty (dito)
- URL-Wohlgeformtheit über `string.startsWith('http')` hinaus
- Orphan-Bilder (Bilder im Ordner, die nicht in `images[]` stehen und nicht im Body referenziert sind)

---

## 6. Migrations-Workflow (die 18 Altposts)

**Vor** der Pipeline-Implementierung wird einmalig ein Redaktions-Durchlauf gemacht, Claude-assistiert. Pro Post:

1. Bestehendes Frontmatter lesen.
2. Bilder im Post-Ordner listen. Hugo-Derivate (`*_hu_*.ext`) ignorieren.
3. Body-Kontext extrahieren (Text vor/nach jedem Bild + Dateiname).
4. Für jedes Bild schlägt Claude vor:
   - `alt` (aus Kontext + Dateiname abgeleitet)
   - `role: cover` für das Frontmatter-Cover-Bild
   - `license` + `authors` = Eigenwerte, **wenn** der Kontext klar auf Eigenaufnahme hindeutet; sonst `UNKNOWN` mit Notiz
5. Jörg reviewt, korrigiert, nickt ab.
6. Pipeline-Autor schreibt Frontmatter-Patch.
7. Commit pro Post oder gebündelt nach Batch.

**Minimaler Fall pro Post:**

```yaml
---
# bisheriges Frontmatter bleibt
# ergänzt wird:

images:
  - file: cover.jpg
    role: cover
    alt: "..."
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  - file: bild1.jpg
    alt: "..."
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"
---
```

Fremdbilder bekommen `source_url`, Bilder mit unklarer Provenienz `UNKNOWN`.

---

## 7. Was in Phase 2 entschieden wird

- **Caption-Rendering-Format** (Kurzform-Katalog, Host-Extraktion, Locale-Normalisierung)
- **Body-Caption-Injektion** oder Verzicht
- **Reverse-Routine** aus Caption → YAML
- **`STRICT_MODE=true`** als Standard
- **Orphan-Bild-Detection** in der Validierung
- **`references:`-Feld** für `a`/`e`-Cross-References
- **`p`-Tags** für Text-Autoren mit Nostr-Pubkeys
