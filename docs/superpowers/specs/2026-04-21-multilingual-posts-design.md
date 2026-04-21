# Multilinguale Posts — Design

**Datum:** 2026-04-21
**Status:** Umgesetzt. Live seit 2026-04-21 via drei Pläne (Pipeline, SPA-Resolving, UI-i18n).
**Scope:** Posts der SPA in mehreren Sprachen anbieten; UI-Chrome lokalisieren; Publish-Pipeline entsprechend anpassen.

## Umsetzungshinweis

Das Design unten beschreibt den angenommenen Produktstand. Während der
Implementierung gab es eine kleine Abweichung beim Sprach-Hinweis im Post:
Statt „Auch verfügbar in: English" wird ein kompakter Switcher gerendert
(`📖 DE | EN`), der Sprachcode + globale Locale-Umschaltung in einem
Klick kombiniert. Grund: UI-Sprache und Anzeige-Sprache bleiben
konsistent, Switcher-Stil identisch zum Header. Siehe
[`docs/HANDOFF.md`](../../HANDOFF.md) für das Nutzer:innen-Verhalten.

## Ziel

Posts können in beliebigen Sprachen existieren. Posts, die inhaltlich dasselbe Thema in unterschiedlichen Sprachen behandeln, werden über nostr-native Referenzen verknüpft, sodass die SPA eine Sprachwahl anbieten kann. Das Repo bleibt Quelle der Wahrheit; die GitHub-Action publisht weiterhin automatisch.

## Scope

- **In Scope:** Verzeichnisstruktur `content/posts/<lang>/<slug>/` inkl. Anpassung der Build-Logik und der SvelteKit-Repräsentation (Routing, Datenquellen); Frontmatter-Erweiterung um `lang` und optional `a`-tag-Verweise; Anpassung des Deno-Publish-Skripts; UI-Lokalisierung (Chrome-Strings) mit `svelte-i18n`; Sprachwahl und Fallback-Verhalten in der SPA; Migration der 26 bereits publizierten Posts (nur `l=de` ergänzen, kein `d`-tag-Change).
- **Out of Scope:** Übersetzungs-Automatik (LLM-basiert); Community-Contribution-Workflow (PR-Template, Review-Guidelines) — später, wenn Grundlage steht; **sprachspezifische Pfad-Präfixe in URLs** (z. B. `/en/posts/...`) — die Content-Struktur unter `content/posts/<lang>/` ist explizit In Scope, nur das URL-Schema bleibt slug-basiert ohne Locale-Präfix.

## Architektur

### Content-Struktur

```
content/posts/
  de/
    <slug>/
      index.md
      <assets>
  en/
    <slug>/
      index.md
      <assets>
```

Die Sprache ist Verzeichnisebene direkt unter `content/posts/`. Unterhalb der Sprache liegt pro Post ein Verzeichnis, dessen Name der Slug ist — identisch zum bisherigen Schema, nur um eine Ebene tiefer.

**Slugs sind global eindeutig**, unabhängig von der Sprache. Jeder Post bekommt einen Slug, der ihn als Artikel identifiziert. Zwei Sprach-Varianten desselben Themas haben unterschiedliche Slugs (z. B. `moodle-iomad-linux` / `moodle-on-iomad-linux`), weil sie aus nostr-Sicht zwei eigenständige Events sind.

### Frontmatter

Minimale Konvention pro `index.md` — der `a`-Block wird **immer als auskommentierter Platzhalter** angelegt, damit Übersetzungen später durch simples Einkommentieren ergänzt werden können:

```yaml
---
title: "Moodle auf Iomad-Linux"
lang: de
published_at: 2022-02-16
# a:
#   - "30023:<pubkey>:<slug-der-anderssprachigen-variante>"
---
```

- `title` — variiert pro Sprache; kein Einfluss auf URL oder `d`-tag.
- `lang` — ISO-639-1-Code; wird vom Publish-Skript zum `l`-Tag des Events gemappt (`["l", <lang>, "ISO-639-1"]`, flankiert vom Namespace-Tag `["L", "ISO-639-1"]`).
- `a` (optional, Liste; standardmäßig auskommentiert) — `a`-tag-Referenzen im Format `<kind>:<pubkey>:<d-tag>`. Bidirektional: Wenn A auf B verweist, verweist B auch auf A. Beide werden (re-)publisht.

**Bestand:** Viele bzw. alle bereits publizierten Events tragen den `l`-Tag heute schon (beobachtet z. B. in einem `naddr`-Export mit `["L","ISO-639-1"]` und `["l","de","ISO-639-1"]`). Die Migration muss also primär sicherstellen, dass das Repo-Frontmatter konsistent zu den Event-Tags wird — nicht umgekehrt.

### nostr-Event-Mapping

Jede `index.md` wird zu einem `kind:30023` (NIP-23 long-form) Event:

- `d`-tag = Slug (= Name des Post-Unterverzeichnisses direkt unterhalb von `content/posts/<lang>/`). **Keine Sprach-Kodierung und kein Pfad-Präfix im `d`-tag** — der `<lang>`-Ordner ist reine Repo-Organisation und fließt nicht in das Event ein. Eindeutigkeit der Slugs ist Autor:innen-Verantwortung und entsteht durch disziplinierte Slug-Wahl.
- `l`-tag = `["l", <lang>, "ISO-639-1"]` aus dem Frontmatter.
- `a`-tags (optional) = eine pro Eintrag im Frontmatter-`a`-Feld, Format `["a", "30023:<pubkey>:<d-tag>", "<relay-hint>", "translation"]`.

NIP-33-Replacement funktioniert sauber, weil jeder Post einen eigenen `d`-tag hat — auch Übersetzungen haben ihren eigenen, weil der Slug sich unterscheidet.

### Verlinkungs-Semantik

- **Bidirektional**, via `a`-tags in beiden Richtungen.
- Wenn eine Übersetzung hinzukommt: sowohl der neue Post *als auch* das Original werden (re-)publisht, damit beide aufeinander zeigen.
- Die SPA liest die `a`-tags eines geladenen Events und resolvt daraus die verfügbaren Sprach-Varianten (kein zusätzlicher Relay-Lookup nötig).

### SPA-Verhalten

- **Default-Locale:** `navigator.language`, gefallen auf die erste im Projekt definierte Sprache (initial: `de`).
- **Sprachwahl-Button:** Zeigt *nur* Sprachen, für die eine verknüpfte Variante tatsächlich existiert (aus den `a`-tags des aktuellen Events ableitbar).
- **Fallback & Sprach-Hinweise:** Wird ein Post über seinen Slug direkt aufgerufen, zeigt die SPA diesen Post unabhängig von der aktiven Locale — schließlich hat die Nutzer:in genau diese URL geöffnet. Es gibt **keinen einschränkenden Hinweis** („Only available in …"). Stattdessen die umgekehrte, einladende Kennzeichnung: existieren `a`-tag-Varianten in anderen Sprachen, erscheint dezent „Also available in English" / „Auch auf Englisch verfügbar" mit Link auf die jeweilige Slug-URL. Hat ein Post keine Varianten, zeigt die SPA schlicht nichts dazu.
- **URL-Schema:** unverändert. Slug in der URL, Locale als Client-State (Store). Sprachumschalter auf einem Post navigiert zur verlinkten Slug-URL der anderen Sprache.

### UI-Lokalisierung (Chrome)

- Bibliothek: **`svelte-i18n`** (ausgereift, flache Lernkurve, für den kleinen Umfang völlig ausreichend; kein Bedarf für Compile-Time-Optimierung).
- Ein `messages/`-Verzeichnis (oder analog), pro Sprache eine JSON-Datei (`de.json`, `en.json`).
- Strings: Menü, Buttons, Footer-Labels, Impressum-Überschriften, Fallback-Hinweis auf fehlende Übersetzung, Sprachwahl-Labels.
- Post-Content selbst wird **nicht** durch i18n-Bibliothek geschleust — der kommt aus den nostr-Events.

### Publish-Pipeline (GitHub-Action, Deno)

Das bestehende Skript wird angepasst, nicht neu geschrieben. Änderungen:

1. Traversierung: `content/posts/<lang>/<slug>/index.md` statt `content/posts/<slug>/index.md`.
2. Pro Datei: `l`-Tag aus `lang`-Frontmatter setzen.
3. `a`-Tags aus Frontmatter-Liste übernehmen.
4. Idempotenz: Event-ID-Mapping (vermutlich existierendes `.nostr-events.json` o. ä.) pro `d`-tag führen — unverändert, weil `d`-tag weiterhin der Slug ist.
5. Bidirektionale `a`-tag-Wartung: Wenn Post A und B aufeinander verweisen, muss das Frontmatter beider Dateien das Gegenstück enthalten. **Autor:innen-Disziplin**, keine Skript-Magie — das Skript prüft nur, publisht aber nicht ungefragt Umgekehrtes.

### Migration bestehender Posts

Die 26 bereits publizierten Posts tragen den `l=de`-Tag vermutlich bereits auf Event-Ebene (Beispiel `["L","ISO-639-1"]` + `["l","de","ISO-639-1"]` im Export). Die Migration ist daher primär eine Repo-Reorganisation:

1. Alle Posts aus `content/posts/<slug>/` nach `content/posts/de/<slug>/` verschieben.
2. Frontmatter um `lang: de` ergänzen; auskommentierten `a`-Platzhalter anlegen.
3. Publish-Skript laufen lassen → re-publisht mit identischem `d`-tag (NIP-33-Replacement greift). Events bleiben stabil, Repo- und Event-Zustand sind wieder konsistent.

## Komponenten & Verantwortlichkeiten

| Komponente | Verantwortung |
|---|---|
| `content/posts/<lang>/<slug>/` | Quelle der Wahrheit pro Post-Variante |
| Deno-Publish-Skript (GitHub-Action) | Traversiert Struktur, erzeugt nostr-Events mit `l`- und `a`-Tags |
| SvelteKit-SPA | Lädt Events, liest `l`/`a`-Tags, bietet Sprachwahl und Fallback |
| `svelte-i18n`-Messages | UI-Chrome-Strings pro Sprache |
| Locale-Store (SvelteKit) | Aktive Sprache; Default aus `navigator.language` |

## Offene Punkte / Nicht-Entscheidungen

- **Community-Contribution-Workflow** (PR-Template, wer übersetzt was, Review) — bewusst später. Erst muss die Technik stehen.
- **Weitere Sprachen über de/en hinaus** — Framework ist sprach-agnostisch, pro neuer Sprache reicht ein neuer Unterordner und eine neue `messages/<lang>.json`.
- **Konsistenz-Check im Publish-Skript:** Soll es warnen, wenn `a`-tag in einer Datei auf einen `d`-tag zeigt, den es im Repo nicht gibt? Wünschenswert, aber optional.

## Testing

- Publish-Skript: Unit-Test für Traversierung mit Fixture-Dateien; Tag-Erzeugung prüfen.
- SPA: Komponententest für Sprachwahl-Anzeige (nur vorhandene Varianten); Fallback-Pfad.
- Manuell: Vollständiger Roundtrip (Post auf de + en commiten → Action läuft → SPA zeigt Sprachumschalter → Fallback bei reinem de-Post).
