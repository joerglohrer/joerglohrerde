# Strukturierte Bild-Metadaten für Markdown-basierte Nostr-Langform-Beiträge

**Status:** Eingefroren am 2026-04-25 — fertiger Entwurf für externe Veröffentlichung (NIP-Proposal / nostrbook.dev). Solange nicht publiziert, dient diese Repo-Kopie als Referenz und Geschichts-Dokument. Praxis-Konvention, (noch) kein NIP.
**Scope:** Eine Inline-Markdown-Konvention zur Bildattribution (Urheber, Lizenz, Quelle, Bearbeitung), die in jedem Markdown-Editor direkt nutzbar ist und sich verlustfrei auf NIP-92-`imeta`-Tags in `kind:30023`-Events abbilden lässt.
**Ziel:** Ein einheitliches, menschlich lesbares und maschinell parsbares Attributions-Format für Bilder in Nostr-Langform-Beiträgen. TULLU-BA-konform. Zero-Tool: funktioniert ohne Build-Pipeline. Zero-Loss: bidirektional konvertierbar zu `imeta`-Tags, sobald Publishing dazukommt.

---

## Warum es das braucht

Markdowns native Bild-Syntax — `![alt](datei.png)` — trägt nur zwei Felder: das Ziel und einen Alt-Text. Alles andere, was ein korrekt attribuiertes Bild braucht (Urheber, Lizenz, Link zur Lizenz, Quelle, Bearbeitungen — die TULLU-BA-Regel aus der deutschen Urheberrechtspraxis), hat keinen Platz.

Autor:innen haben heute drei unbefriedigende Optionen:

1. **Attribution als freier Fließtext** unter jedem Bild. Gut für Menschen, nicht parsbar.
2. **Inline-HTML-`<figure>`-Blöcke** mit `<figcaption>`. Bricht Markdown-Lint-Tools, schwer editierbar.
3. **Metadaten weglassen.** Risiko stiller Fehlattribution.

NIP-92s `imeta`-Tag löst die Event-seitige Maschinenlesbarkeit (url, mime, sha256, alt usw. pro Bild). Diese Konvention liefert das fehlende Gegenstück: **wie dieselben Informationen bereits im Markdown stehen können — einheitlich, lesbar, parsbar**.

---

## Konvention zur Bildattribution

### Maximale Beispiel-Darstellung

![Rhabarberpflanze mit großen grünen Blättern und roten Stielen in einem Gartenbeet mit Mulch](https://inaturalist-open-data.s3.amazonaws.com/photos/71812633/medium.jpg)
[garden rhubarb, Speise-Rhabarber](https://www.inaturalist.org/photos/71812633), [John Sankey](https://www.inaturalist.org/users/2831535), [CC0](https://creativecommons.org/publicdomain/zero/1.0/), beschnitten

### Maximale Beispiel-Konstruktion

```markdown
![alt](imageUrl)
[title](sourceUrl), [author](authorUrl), [licence](licenceUrl), modification
```

Die Caption-Zeile steht **auf der Zeile direkt nach dem Bild** (Zeilenumbruch, kein Leerzeichen dazwischen).

---

## Regeln

1. **Reihenfolge der Felder:** `alt`, `imageUrl`, `title`, `sourceUrl`, `author`, `authorUrl`, `licence`, `licenceUrl`, `modification`. Die Reihenfolge ist **normativ**, damit Parser sich darauf verlassen können.
2. **Trenner:** Komma + Leerzeichen (`, `) zwischen den Caption-Feldern. Einheitlich, kein Mix aus „von", „via", Pipe usw.
3. **Verlinkungen:**
   - `title` → `sourceUrl`
   - `author` → `authorUrl`
   - `licence` → `licenceUrl`
4. **URL-Disziplin:** Alle URL-Felder sind absolut (`https://…`), niemals relativ.
5. **CC0 / Public Domain:** `sourceUrl` darf entfallen. Urheber:in und Lizenz bleiben aus Transparenzgründen empfohlen.
6. **Bearbeitungen:** Bei CC-BY-Lizenzen ist die Änderung anzugeben, sobald das Werk verändert wurde (Zuschnitt, Farbe, Skalierung, Kombination usw.). Bei CC0 optional.
7. **Barrierefreiheit:** `alt` ist formal optional, aber für WCAG/BITV-Konformität faktisch Pflicht. Leere eckige Klammern `![]` nur bei rein dekorativen Bildern.

---

## (Pflicht-)Felder

| Feld | Status | Bedeutung / Form |
|---|---|---|
| `licence` | **Pflicht** | Lizenz-Kurzform (`CC0`, `CC BY`, `CC BY-SA`, `©`, …) |
| `licenceUrl` | **Pflicht** | Kanonische Lizenz-URL, z. B. `https://creativecommons.org/publicdomain/zero/1.0/` |
| `imageUrl` | **Pflicht** | Absolute URL zur Bilddatei (sonst nicht renderbar) |
| `sourceUrl` | **Pflicht** außer bei CC0 | URL zur Quellseite (Link in `title`) |
| `author` | **Pflicht** außer bei CC0 | Name der Urheber:in |
| `authorUrl` | optional | Profil-/Homepage-URL der Urheber:in |
| `modification` | optional (Pflicht bei Bearbeitung von CC-BY-Werken) | Freitext zur Bearbeitung |
| `title` | optional | Titel des Werks |
| `alt` | optional (faktisch Pflicht für Accessibility) | Screen-Reader-Beschreibung |

---

## Minimale Beispiel-Darstellung

![](https://inaturalist-open-data.s3.amazonaws.com/photos/71812633/medium.jpg)
[CC0](https://creativecommons.org/publicdomain/zero/1.0/)

### Minimale Beispiel-Konstruktion

```markdown
![](imageUrl)
[licence](licenceUrl)
```

Die harte Mindestanforderung: **Bild + Lizenz-Link**. Alles andere darf weg, wenn es die Lizenz erlaubt (z. B. CC0).

---

## Zwischenformen

Zwischen Minimum und Maximum sind alle Teilmengen erlaubt, solange die Reihenfolge eingehalten wird und die Pflichtfelder der jeweiligen Lizenz erfüllt sind.

**CC0-Eigenbild mit Urheberangabe (empfohlen für Transparenz):**
```markdown
![Hase auf Wiese](cover.jpg)
Comenius-Institut, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
```

**CC-BY-Fremdbild ohne Titel:**
```markdown
![Schlüssel mit Schild "Ermutigung"](ermutigung.jpg)
[Jörg Lohrer](https://www.flickr.com/photos/empeiria/8553607289/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
```

---

## Parsing-Regeln (für Tooling)

Die Konvention ist für **Menschen** geschrieben. Parser haben die Aufgabe, sich daran möglichst anzupassen — **nicht umgekehrt**. Sonderzeichen, Rollen-Wörter oder sprach-abhängige Marker werden bewusst nicht vorgeschrieben, weil sie den Schreibfluss behindern würden.

Ein Parser erkennt eine Attributions-Caption anhand dieser Merkmale:

- **Position:** direkt nach einer Markdown-Bild-Zeile (`![alt](imageUrl)`), auf der nächsten Zeile ohne Leerzeile dazwischen.
- **Struktur:** eine oder mehrere `[label](url)`-Markdown-Links, getrennt durch `, `, optional abschließender Freitext-Teil für `modification`.
- **Feld-Zuordnung** nach Position in der Reihenfolge gemäß Regel 1:
  - Erster Link vor einem eventuellen Personennamen-Link = `title` + `sourceUrl`
  - Zweiter Link (Personenname) = `author` + `authorUrl`
  - Dritter Link (CC-Kürzel) = `licence` + `licenceUrl`
  - Alles danach (ohne Klammer-Syntax) = `modification`

**Eindeutige Fälle:**

- **Drei Links** → `title`/`sourceUrl`, `author`/`authorUrl`, `licence`/`licenceUrl` in dieser Reihenfolge. Der letzte Link muss auf ein Lizenz-URL-Pattern matchen.
- **Zwei Links**, zweiter matcht Lizenz-Pattern → `author`/`authorUrl` + `licence`/`licenceUrl`. Ein Titel ohne Autor:in wird konventionell nicht vergeben — das erste `[Text](url)` ist in zwei-Link-Fällen immer `author`.
- **Ein Link + unverlinkter Text + Lizenz-Link** → unverlinkter Text ist `author`, Link vor der Lizenz wäre `title+sourceUrl`.
- **Nur ein Link**, matcht Lizenz-Pattern → `licence`/`licenceUrl`. Minimal-Form.
- **Unverlinkter String vor der Lizenz** → `author` (ohne URL).
- **Freitext nach der Lizenz** → `modification`.

**Mehrdeutige Fälle** (z. B. `[Etwas](url), [CC0](url)` — Autor oder Titel?):

- **Parser-Empfehlung:** LLM-gestützter Parser nimmt Kontext dazu (Bild-Alt-Text, Body-Kontext, Plattform-Muster der URL) und ordnet zu.
- **Reiner Regex-Parser:** markiert die Caption als **ambigue** und eskaliert zur redaktionellen Prüfung (statt zu raten).
- **Schreibende:** können Mehrdeutigkeit jederzeit selbst auflösen, indem sie beide Felder setzen (`[Titel](url), [Autor](url), [Lizenz](url)`). Ein Titel ohne Autor:in ist die Ausnahme; wer Eindeutigkeit braucht, ergänzt die Urheber:in.

Der Parser bricht nie stillschweigend. Eine Caption ist entweder eindeutig geparst, eindeutig Minimal-Form, oder **wird als prüfbedürftig markiert** — nie still falsch interpretiert.

---

## Abbildung auf das Nostr-Event (`imeta`, NIP-92)

Jedes Bild im Beitrag wird als eigener `imeta`-Tag im `kind:30023`-Event codiert:

```
["imeta",
  "url <imageUrl>",
  "m <mime>",
  "x <sha256>",
  "alt <alt>",                   wenn nicht leer
  "title <title>",               wenn vorhanden
  "source_url <sourceUrl>",      wenn vorhanden
  "author <author>",             wenn vorhanden; ein Eintrag pro Autor:in
  "author_url <authorUrl>",      wenn vorhanden
  "license <licenceUrl>",        Pflicht
  "modification <modification>"  wenn vorhanden
]
```

**Normativ:**

- `url`, `m`, `x`, `license` sind **Pflicht** im `imeta`.
- `license` ist immer die volle URL, nicht die Kurzform (maschinenlesbar, Clients können daraus die Kurzform zur Anzeige ableiten).
- `m` (mime) und `x` (sha256) kommen nicht aus der Caption, sondern werden beim Upload zum Blob-Host (z. B. Blossom) ermittelt.

**Erweiterung über NIP-92 hinaus:** Die Felder `title`, `source_url`, `author`, `author_url`, `modification` sind keine NIP-92-Kernfelder. NIP-92 erlaubt Implementierenden ausdrücklich, zusätzliche Felder einzuführen; Clients ignorieren unbekannte Felder. Diese Konvention nutzt diese Erweiterungsmöglichkeit, um TULLU-BA-Daten direkt beim Bild mitzuführen.

---

## Bidirektionale Abbildung (Markdown ↔ `imeta`)

### Hinweg: Markdown → `imeta`

1. Parser findet `![alt](imageUrl)` im Body.
2. Nächste Zeile wird als Caption interpretiert, Felder nach Reihenfolge-Regel extrahiert.
3. Bild wird hochgeladen (z. B. Blossom), `url`/`mime`/`sha256` werden aus der Upload-Antwort ergänzt.
4. `imeta`-Tag wird aus Caption-Feldern + Upload-Daten gebaut.
5. Markdown-Body wird angepasst: ursprüngliche `imageUrl` → Upload-URL. Die Caption-Zeile bleibt erhalten (oder wird entfernt, wenn der Client sie aus `imeta` rendert — Entscheidung des Publishing-Tools).

### Rückweg: `imeta` → Markdown

1. Client liest Event, extrahiert pro `imeta`-Tag die Felder.
2. Rendert `![alt](url)` mit `alt` aus dem Tag.
3. Rendert darunter eine Caption-Zeile mit den vorhandenen Feldern in der normativen Reihenfolge aus Regel 1.
4. `license` (URL) wird über einen Kurzform-Katalog (siehe Anhang) in eine lesbare Kurzform übersetzt (`CC0`, `CC BY 4.0`, …).

Weil die Reihenfolge normativ ist und die Trennzeichen einheitlich, lässt sich beides verlustfrei ineinander übersetzen.

---

## Beispiel: End-to-End

### Markdown im Editor

```markdown
![Rhabarberpflanze mit großen grünen Blättern und roten Stielen in einem Gartenbeet mit Mulch](https://inaturalist-open-data.s3.amazonaws.com/photos/71812633/medium.jpg)
[garden rhubarb, Speise-Rhabarber](https://www.inaturalist.org/photos/71812633), [John Sankey](https://www.inaturalist.org/users/2831535), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), beschnitten
```

### Geparst

| Feld | Wert |
|---|---|
| `alt` | Rhabarberpflanze mit großen grünen Blättern … |
| `imageUrl` | https://inaturalist-open-data.s3.amazonaws.com/photos/71812633/medium.jpg |
| `title` | garden rhubarb, Speise-Rhabarber |
| `sourceUrl` | https://www.inaturalist.org/photos/71812633 |
| `author` | John Sankey |
| `authorUrl` | https://www.inaturalist.org/users/2831535 |
| `licence` | CC BY-SA 4.0 |
| `licenceUrl` | https://creativecommons.org/licenses/by-sa/4.0/ |
| `modification` | beschnitten |

### Als `imeta`-Tag im `kind:30023`-Event (nach Blossom-Upload)

```
["imeta",
  "url https://blossom.example/abc123…def.jpg",
  "m image/jpeg",
  "x abc123…def",
  "alt Rhabarberpflanze mit großen grünen Blättern und roten Stielen in einem Gartenbeet mit Mulch",
  "title garden rhubarb, Speise-Rhabarber",
  "source_url https://www.inaturalist.org/photos/71812633",
  "author John Sankey",
  "author_url https://www.inaturalist.org/users/2831535",
  "license https://creativecommons.org/licenses/by-sa/4.0/",
  "modification beschnitten"
]
```

### Beim Rendern in einem Nostr-Client

Der Client, der dieses `imeta` versteht, rekonstruiert die Caption nach derselben Konvention:

```markdown
![Rhabarberpflanze …](https://blossom.example/abc123…def.jpg)
[garden rhubarb, Speise-Rhabarber](https://www.inaturalist.org/photos/71812633), [John Sankey](https://www.inaturalist.org/users/2831535), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), beschnitten
```

Ein Client, der die erweiterten `imeta`-Felder nicht kennt, zeigt immerhin `![alt](url)` korrekt an und ignoriert den Rest — Graceful Degradation.

---

## Anhang: Lizenz-URL → Kurzform-Katalog

| Lizenz-URL-Präfix | Kurzform |
|---|---|
| `https://creativecommons.org/publicdomain/zero/1.0/` | `CC0` |
| `https://creativecommons.org/publicdomain/mark/1.0/` | `Public Domain` |
| `https://creativecommons.org/licenses/by/4.0/` | `CC BY 4.0` |
| `https://creativecommons.org/licenses/by-sa/4.0/` | `CC BY-SA 4.0` |
| `https://creativecommons.org/licenses/by-nd/4.0/` | `CC BY-ND 4.0` |
| `https://creativecommons.org/licenses/by-nc/4.0/` | `CC BY-NC 4.0` |
| `https://creativecommons.org/licenses/by-nc-sa/4.0/` | `CC BY-NC-SA 4.0` |
| `https://creativecommons.org/licenses/by-nc-nd/4.0/` | `CC BY-NC-ND 4.0` |
| *alles andere* | Host der URL als Kurzform-Fallback |

Locale-Suffixe (`/deed.de`, `/deed.en`) werden bei der Kurzform-Auflösung auf die Basis-URL reduziert. Für Versionen (`3.0` statt `4.0`) wird die Version mit angezeigt.

---

## Offene Fragen an die Community

1. **Reihenfolge normativ oder locker?** Die normative Reihenfolge macht den Parser einfach. Eine lockere Variante (Felder an beliebiger Position, Erkennung per URL-Pattern) wäre toleranter, aber fragiler. Empfehlung: normativ. Meinungen?

2. **Mehrere Autor:innen pro Bild.** Ein Bild mit Ko-Autorenschaft: `[Jane Doe](…) / [John Doe](…)`? Oder Komma-getrennt `[Jane Doe](…), [John Doe](…)`? Letzteres kollidiert mit dem Feld-Trenner. Empfehlung: `/` als Autor:innen-Trenner innerhalb des `author`-Slots.

3. **Mehrere Lizenzen pro Bild.** CC-Dual-Licensing (z. B. „CC BY-SA **oder** GFDL") — `[CC BY-SA](url) / [GFDL](url)` analog zu Autor:innen?

4. **Kanonischer Kurzform-Katalog.** Die Tabelle ist praktikabel, aber nicht normativ. Eine Registry von Lizenz-URL-zu-Kurzform-Mappings, referenzierbar an einer Stelle, würde Interop erleichtern.

5. **Sprach-Rollen-Wörter.** Diese Konvention verzichtet auf einleitende Wörter wie „Foto:", „Photo:", „Bild:". Das macht sie sprach-agnostisch. Will jemand ein optionales Rollen-Wort erlauben (`*Foto: [title](url), …*`), damit Attributionen in langen Texten klarer identifizierbar sind?

6. **Repo-Workflow-Ergänzung.** Wer Markdown in einem Git-Repo mit Build-Pipeline pflegt, möchte manchmal Metadaten **strukturiert im YAML-Frontmatter** statt im Body. Ein paralleler YAML-Mapping (gleiche Felder, gleiche Semantik, Array unter `images:`) kann als Ergänzung leben, wobei die Inline-Markdown-Form die Basis bleibt und beides bidirektional konvertierbar ist.

---

## Referenzen

- [NIP-23 — Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [NIP-92 — Media Attachments (`imeta`)](https://github.com/nostr-protocol/nips/blob/master/92.md)
- [Blossom BUD-01 — Server Requirements](https://github.com/hzrd149/blossom/blob/master/buds/01.md)
- [TULLU / TULLU-BA Attributions-Regel (Wikimedia Deutschland)](https://commons.wikimedia.org/wiki/Commons:Lizenzhinweisgenerator)
- [schema.org/CreativeWork — `license`-Feld](https://schema.org/license)
- [WCAG 2.1 — Accessible Alt Text](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
