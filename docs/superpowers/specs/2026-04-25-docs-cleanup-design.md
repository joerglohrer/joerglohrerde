# Doku-Aufräumung — Design

**Datum:** 2026-04-25
**Status:** Entwurf
**Scope:** Strukturelle Bereinigung der Repo-Doku nach erreichten Kernzielen
(SPA + Pipeline + Multilingual live). Keine Code-Änderungen. Ziel ist ein
ehrlicher Doku-Stand mit klarer Rollenverteilung der Top-Level-Dokumente,
korrekten Status-Feldern in den Specs und einer sichtbaren Trennung zwischen
"lebender Doku" und "Geschichte".

## Auslöser

Die Inventur am 2026-04-25 hat drei strukturelle Probleme aufgedeckt:

1. **Specs lügen über ihren Status.** Die zwei ältesten Specs sagen
   "Entwurf, ausstehende User-Freigabe", obwohl beide seit dem 18. April
   live sind. Eine Spec hat ein abweichendes Header-Format (`**Stand:**`
   statt `**Status:**`).
2. **Pläne sind Geschichte, stehen aber im aktiven Blickfeld.** Alle sechs
   Pläne haben 0 abgehakte Checkboxen, obwohl die zugehörigen Features
   nachweislich live sind. STATUS.md sagt "alle Pläne erledigt" —
   das stimmt für die fünf Multilingual-/SPA-/Pipeline-Pläne, kollidiert
   aber mit `2026-04-21-prerender-snapshot.md`, der nicht umgesetzt ist.
3. **Vier Top-Level-Dokumente überlappen.** README, STATUS.md, HANDOFF.md
   und CLAUDE.md verlinken jeweils unterschiedliche Teilmengen der Specs;
   keine klare Single-Source-of-Truth für Konventionen vs. Logbuch vs.
   Außensicht vs. Session-Einstieg.

## Ziele

- Specs spiegeln den realen Implementierungsstand wider.
- Pläne sind als Historie sichtbar archiviert; was noch nicht umgesetzt
  ist, ist als solches gekennzeichnet.
- Jedes Top-Level-Dokument hat genau eine Rolle, und die ist im Doc selbst
  benannt.
- Wiki-Entwürfe haben einen expliziten Status: lebend, eingefroren oder
  publiziert.

Ausdrücklich **nicht** Ziel:
- Inhaltliche Überarbeitung der Specs (keine Detail-Korrekturen am
  Designgehalt, nur Status und Querverweise).
- Konsolidierung von STATUS.md + HANDOFF.md zu einem Dokument — die beiden
  Rollen sollen erhalten bleiben, nur klarer abgegrenzt.

## Maßnahmen

### M1 — Specs: Status-Header vereinheitlichen und nachziehen

**Konvention** (gilt fortan für alle Specs):

```markdown
# <Titel>

**Datum:** YYYY-MM-DD
**Status:** <einer von: Entwurf | In Umsetzung | Umgesetzt (live seit YYYY-MM-DD) | Eingefroren | Verworfen>
**Scope:** <ein Satz>
```

Die einheitliche Status-Stufenfolge: `Entwurf` → `In Umsetzung` →
`Umgesetzt (live seit …)`. Alternative Endstände: `Eingefroren` (Idee gut,
aber nicht aktiv verfolgt) oder `Verworfen` (mit kurzem Grund). Bei
Status-Änderungen das Datum als Suffix in Klammern führen.

**Pro Spec konkret:**

- `2026-04-15-nostr-page-design.md` →
  `Status: Umgesetzt (live seit 2026-04-18)`.
- `2026-04-15-publish-pipeline-design.md` →
  `Status: Umgesetzt (live seit 2026-04-18)`. Die Inline-Notiz
  "Designentscheidung 2026-04-16: Blossom für alle Bilder" bleibt im
  Body, der Header wird klar.
- `2026-04-16-image-metadata-convention.md` →
  `Status: Umgesetzt — Phase 1 (live seit 2026-04-18)`. Body bleibt
  unverändert; die im Body bereits markierten Phase-2-Punkte
  (Caption-Rendering, Reverse-Routine, License-Katalog, strikte
  Validierung) bleiben offen.
- `2026-04-21-multilingual-posts-design.md` → bereits korrekt,
  Format ggf. minimal nachziehen (`Umgesetzt (live seit 2026-04-21)`).
- `2026-04-21-prerender-snapshot-design.md` → `**Stand:**` durch
  `**Status:** Entwurf` ersetzen, Datum-Zeile ergänzen. Hinweis im Body:
  "Plan-Pendant unter `plans/archive/2026-04-21-prerender-snapshot.md`
  liegt noch unbearbeitet vor."

### M2 — Pläne ins Archiv

**Aktion:**

```sh
mkdir -p docs/superpowers/plans/archive
git mv docs/superpowers/plans/2026-04-15-spa-sveltekit.md \
       docs/superpowers/plans/2026-04-16-publish-pipeline.md \
       docs/superpowers/plans/2026-04-21-multilingual-posts-pipeline.md \
       docs/superpowers/plans/2026-04-21-multilingual-posts-spa.md \
       docs/superpowers/plans/2026-04-21-multilingual-posts-i18n.md \
       docs/superpowers/plans/2026-04-21-prerender-snapshot.md \
       docs/superpowers/plans/archive/
```

**Begründung:** Alle sechs Pläne sind entweder umgesetzt (5) oder
eingefroren (1, prerender-snapshot). Keiner ist aktuell aktiv. Die
Trennung "Plans-Verzeichnis = aktive Pläne" / "Archive = Geschichte"
hält das aktive Blickfeld leer und ehrlich.

**Checkboxen werden NICHT retrospektiv nachgepflegt.** Die archivierten
Pläne bleiben so wie sie sind. Wer den Soll-Stand wissen will, liest
STATUS.md und die zugehörige Spec.

**`plans/archive/README.md` neu anlegen**, ein paar Zeilen, ungefähr:

```markdown
# Plan-Archiv

Diese Pläne sind abgearbeitet (5) oder zu Eis gelegt (1). Checkboxen
spiegeln nicht den realen Umsetzungsstand wider — sie wurden während
der Umsetzung nicht nachgepflegt. Verbindlicher Stand ist STATUS.md
und die jeweilige Spec.

| Plan | Spec | Stand |
|---|---|---|
| 2026-04-15-spa-sveltekit | nostr-page-design | umgesetzt 2026-04-18 |
| 2026-04-16-publish-pipeline | publish-pipeline-design | umgesetzt 2026-04-18 |
| 2026-04-21-multilingual-posts-pipeline | multilingual-posts-design | umgesetzt 2026-04-21 |
| 2026-04-21-multilingual-posts-spa | multilingual-posts-design | umgesetzt 2026-04-21 |
| 2026-04-21-multilingual-posts-i18n | multilingual-posts-design | umgesetzt 2026-04-21 |
| 2026-04-21-prerender-snapshot | prerender-snapshot-design | eingefroren |
```

`docs/superpowers/plans/` bleibt als Verzeichnis erhalten (mit `.gitkeep`),
damit die Konvention "hier liegen aktive Pläne" sofort wieder genutzt
werden kann, wenn ein neuer Plan entsteht.

### M3 — Top-Level-Dokumente: Rollen festlegen

Pro Dokument ein **Rollensatz** ganz oben (unter dem Titel), so dass beim
Reinklicken sofort klar ist, wofür es da ist.

| Datei | Rolle | Zielgruppe |
|---|---|---|
| `README.md` | Außensicht: was ist das Repo, wie funktioniert es grob, wo geht's weiter | Besucher:innen, GitHub-Crawler |
| `docs/STATUS.md` | Logbuch: aktueller Stand + Erledigt-Chronologie | Jörg + Claude beim Wiedereinstieg |
| `docs/HANDOFF.md` | Konventions-Handbuch: wie man hier arbeitet (Posts, Übersetzungen, Deploys, Stolperfallen) | Jörg + Claude im Alltag |
| `CLAUDE.md` | Session-Einstieg: Lese-Reihenfolge, Tonfall, kritische Fallstricke | Claude beim Session-Start |

**Konkrete Edits:**

- **README.md** — Lange Spec-/Plan-Linkliste auf 3 Specs eindampfen:
  SPA, Publish-Pipeline, Multilingual (das sind die drei, die das
  Außenbild der Seite erklären). Bild-Metadaten-Konvention und
  prerender-Spec sind interne Detail-Themen und gehören nicht in die
  README. Plan-Verlinkungen ganz raus, stattdessen ein Hinweis auf
  `docs/superpowers/plans/archive/`. Erste Zeile nach dem Titel:
  kurzer Rollensatz.
- **STATUS.md** — Erste Zeile: Rollensatz. "Erledigt"-Chronologie bleibt,
  ist Logbuch. Widerspruch "alle Pläne erledigt" auflösen: Satz so
  umformulieren, dass prerender-snapshot als eingefrorenes Vorhaben
  separat aufgeführt ist.
- **HANDOFF.md** — Rollensatz oben. Workflow-Inhalte und Stolperfallen
  bleiben.
- **CLAUDE.md** — Rollensatz oben. Quick-Links auf den finalen Spec-Stand
  bringen (5 Specs inkl. prerender). "Kritische Fallstricke" bleibt
  unverändert (alle 5 Punkte sind aktuell relevant).

**Single-Source-of-Truth-Regeln** (in HANDOFF.md kurz festhalten, damit
zukünftiges Edit-Verhalten klar ist):

- *Live-URLs / Setup-Stand* steht in **STATUS.md**. HANDOFF/README/CLAUDE
  zitieren oder verlinken, duplizieren nicht.
- *Frontmatter-Konventionen, Workflows, Stolperfallen* stehen in
  **HANDOFF.md**.
- *Spec-Liste* ist die Realität in `docs/superpowers/specs/` —
  README/CLAUDE.md verlinken nur die für ihre Zielgruppe relevanten.

### M4 — Wiki-Entwürfe: Status klären

Drei Dateien, drei Entscheidungen:

- `docs/redaktion-bild-metadaten.md` — Frontmatter-Block oben ergänzen:
  ```markdown
  **Status:** Schnappschuss vom 2026-04-18 — als Hilfsmittel für die
  Migrations-Sitzung erstellt, kein laufender Workflow. Bleibt als
  Referenz erhalten.
  ```
- `docs/wiki-entwurf-nostr-bild-metadaten.md` (DE) und
  `docs/wiki-draft-nostr-image-metadata.md` (EN) — beide bekommen oben:
  ```markdown
  **Status:** Eingefroren am 2026-04-25 — fertige Entwürfe für externe
  Veröffentlichung (NIP-Proposal / nostrbook.dev). Solange nicht
  publiziert, dient diese Repo-Kopie als Referenz und Geschichts-Dokument.
  ```

Bei späterer externer Veröffentlichung wird der Status auf
`Publiziert (URL)` aktualisiert.

### M5 — `github-ci-setup.md`

Ergänzung oben:

```markdown
**Status:** Aktuell genutzt; mittelfristig zu ersetzen durch self-hosted
CI (siehe HANDOFF.md → Option D).
```

Keine inhaltliche Änderung — die Setup-Schritte sind nach wie vor
korrekt für die heute laufende Pipeline.

## Reihenfolge der Umsetzung

1. M1 — Spec-Header durchziehen (am wichtigsten, alles andere baut darauf
   auf).
2. M2 — Pläne archivieren + Archiv-README schreiben.
3. M3 — Top-Level-Dokumente (Rollensätze + Link-Bereinigung).
4. M4 + M5 — kleine Status-Stempel auf Wiki/CI-Doku.
5. Commit, ggf. in 2-3 logischen Schritten.

## Erfolgskriterien

- `grep -r "ausstehende User-Freigabe" docs/superpowers/specs/` liefert
  nichts.
- `ls docs/superpowers/plans/` zeigt nur `archive/` (+ ggf. `.gitkeep`).
- Jede der vier Top-Level-Dateien beginnt mit einem Rollensatz.
- README enthält keine Verweise auf einzelne Pläne mehr (nur auf das
  Archiv-Verzeichnis).
- Specs haben einheitliches `**Status:**`-Format.

## Was bewusst nicht gemacht wird

- **Keine inhaltliche Überarbeitung** der Specs. Falls beim Status-Update
  inhaltliche Lügen auffallen (z. B. Spec beschreibt Feature anders als
  es live ist), wird das in dieser Spec **nicht** mitgefixt — separat als
  eigenes Vorhaben aufnehmen.
- **Keine Konsolidierung** von STATUS.md + HANDOFF.md. Beide bleiben
  bestehen, nur Rollen werden klarer benannt.
- **Keine Frontmatter-Felder** (`status:`, `superseded-by:`) in den
  Specs. Text-Header reicht für die aktuelle Repo-Größe; YAML-Metadaten
  wären Overkill.
- **Keine retrospektiven Checkbox-Updates** in den archivierten Plänen.

## Folgevorhaben (außerhalb dieser Spec)

- **Paket B — SPA-Konsolidierung:** Tag-/Date-/Locale-Utilities
  extrahieren, Stores auf Runes migrieren, `PostView.svelte` entzerren.
- **Paket C — Pipeline-Härtung:** `cli.ts` aufbrechen, Tests für
  `signer.ts` + `check.ts`, CWD-Sensitivität fixen.
- Entscheidung über prerender-snapshot: weiterverfolgen oder verwerfen.
