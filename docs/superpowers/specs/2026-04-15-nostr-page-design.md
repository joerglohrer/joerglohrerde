# Nostr-Page auf Basis von Events — Design-Spec

**Datum:** 2026-04-15
**Status:** Entwurf, ausstehende User-Freigabe
**Scope:** Ablösung der Hugo-Seite `joerg-lohrer.de` durch eine SvelteKit-SPA, die Blog-Posts live aus Nostr-Events rendert. Diese Spec beschreibt **nur die SPA und den Event-/URL-Kontrakt**. Publish-Pipeline (Markdown → Event → Relays + Assets-Upload) ist separate Spec.

---

## 1. Gesamtarchitektur

```
                    Browser                          JS-loser Client / Bot
                       │                                        │
                       ▼                                        ▼
         ┌─────────────────────────────┐        ┌───────────────────────────┐
         │ All-Inkl (statisches Hosting)│       │ All-Inkl liefert          │
         │  • index.html (SPA-Shell)   │        │  index.html (leere Shell, │
         │  • _app/*.js, *.css          │       │  kein Post-Inhalt, keine  │
         │  • .htaccess (SPA-Fallback) │        │  OG-Tags für Posts)       │
         │  • images/ bzw. Permalink-  │        └───────────────────────────┘
         │    Pfade für Altbilder       │
         └──────────────┬──────────────┘
                        │
                        ▼
         ┌─────────────────────────────────────┐
         │ Public Nostr-Relays (wss://)        │
         │  damus.io, nos.lol, nostr.wine,     │
         │  relay.nostr.band …                 │
         │  (später erweiterbar um eigene)     │
         └─────────────────────────────────────┘

         Publish-Flow (separate Spec, nur Artefakte hier relevant):
           Markdown → signiertes kind:30023 Event → Public-Relays
           Bilder (Altbestand) → All-Inkl unter Post-Permalink-Pfad
           Bilder (neu) → Blossom-Server (Multi-Upload, single URL im Markdown)
```

### Kernprinzipien

- **All-Inkl hostet nur eine statische SPA-Shell** plus Assets: Altbilder (unter Post-Permalink-Pfaden), Site-Icons, `robots.txt`. Kein Post-Body, keine Stubs, kein Backend.
- **Posts existieren als signierte NIP-23-Events auf mehreren Public-Relays.** Die SPA holt sie zur Laufzeit.
- **URL-Struktur bleibt kompatibel zur bestehenden Hugo-Seite.** Backlinks brechen nicht.
- **Minimale eigene Infrastruktur jetzt** (keine eigene Relay-Instanz, kein eigener Blossom-Server). Alles nachrüstbar ohne Bruch.
- **Bewusst akzeptierte Kosten:** kein SEO, keine Social-Previews in Phase 1. Siehe Risiken und Evolutionspfad.

### Kostenübersicht Phase 1

- All-Inkl: unverändert (vorhandener Tarif).
- Public-Relays: 0 €.
- Public-Blossom-Server (nur Neu-Bilder ab Phase 2): 0 €.
- Domain `joerg-lohrer.de`: unverändert.
- **Zusatzkosten: keine.**

---

## 2. URL-Struktur, Routing, Event-Kontrakt

### URL-Schema

**Kanonische Form — kurz und teilbar:**

| URL | Inhalt |
|---|---|
| `/` | SPA-Shell. SPA rendert Startseite (Profilkachel + Post-Liste). |
| `/<dtag>/` | **Kanonische Post-URL.** SPA-Router extrahiert `<dtag>` und lädt Event. |
| `/tag/<name>/` | SPA-Shell, SPA rendert Tag-Filter. |
| `/impressum/` | Statisches HTML (rechtlicher Content, liegt wirklich auf Server). |
| `/favicon.ico`, `/logo.png`, `/robots.txt` | globale Site-Assets. |

**Legacy-Form — nur für Backlink-Kompatibilität:**

Die bestehenden Hugo-URLs haben die Form `/YYYY/MM/DD/<dtag>.html/`. Externe Backlinks (Google, Mastodon-Bookmarks etc.) zeigen auf diese URLs. Die SPA behandelt sie so:

1. `.htaccess` rewriet den Pfad auf `index.html` (wie alle SPA-Routen).
2. Der Client-Router erkennt das Legacy-Muster, extrahiert den `<dtag>` am Ende.
3. Via `history.replaceState()` wird die URL in der Adressleiste ohne Reload auf die kanonische kurze Form `/<dtag>/` umgeschrieben.
4. Post wird über normalen kanonischen Weg geladen.

So bleiben alle alten Links funktional, aber die geteilten/bookmarkten URLs konvergieren zur kurzen Form. **Neue Posts werden nur unter der kurzen Form verbreitet** — die Datumsform ist keine aktive URL-Strategie mehr, nur Legacy.

**Datum in der URL** dient nur der Legacy-Kompatibilität. Die SPA benötigt zur Event-Abfrage nur den `dtag`; sie fragt Relays mit `kinds:[30023], authors:[<pubkey>], #d:[<dtag>]`.

**Bildpfade der 18 Altposts** folgen dem historischen Hugo-Schema (`/YYYY/MM/DD/<dtag>.html/<bildname>`), weil die Bilder bereits dort auf All-Inkl liegen und relative Verweise in den Markdown-Bodies auf diese absoluten URLs umgeschrieben werden. Neue Posts nutzen Blossom-URLs (siehe Publish-Spec).

### `.htaccess`

```apache
RewriteEngine On

# HTTPS forcieren
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Existierende Datei oder Verzeichnis? Direkt ausliefern (Bilder, _app/*, favicon etc.).
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Alles andere → SPA-Fallback.
RewriteRule ^ /index.html [L]
```

### Event-Kontrakt (NIP-23, `kind:30023`)

Normatives Schema; Publish-Spec muss es einhalten, SPA verlässt sich darauf.

**Pflicht-Tags pro Event:**

- `["d", "<slug>"]` — URL-Slug. Stabiler Identifier über Edits hinweg (replaceable-Semantik).
- `["title", "<post title>"]`
- `["published_at", "<unix-timestamp>"]` — ursprüngliches Veröffentlichungsdatum.

**Empfohlene Tags:**

- `["summary", "<kurzbeschreibung>"]` — genutzt in Listen-Previews.
- `["image", "<url>"]` — Vorschaubild.
- `["t", "<tag>"]` — mehrfach erlaubt, Kategorien/Tags.

**Content:** Markdown. Bilder als Markdown-Syntax mit absoluten URLs.

**Bild-URL-Policy pro Post-Ära:**

- Migrations-Posts (bestehende 18 Posts, 2013–2024): Bild-URLs auf `joerg-lohrer.de` unter Post-Permalink-Pfad, z. B. `https://joerg-lohrer.de/2023/03/23/gleichnis-vom-saemann.html/bild1.jpeg`. Bilder liegen tatsächlich dort.
- Neue Posts (ab Phase 2): Bild-URLs auf Blossom-Server, z. B. `https://blossom.primal.net/abc123…def.jpeg`. Upload zu 2–3 Blossom-Servern parallel (BUD-03-Pattern), Markdown referenziert jeweils nur eine URL.

Die SPA unterscheidet die beiden Eras nicht — sie rendert Markdown, der Browser lädt die absolute URL, wo sie auch liegt.

### SPA-Routing

SvelteKit mit `adapter-static`, `ssr: false`, Fallback-Page `index.html`. Routen:

- `/` → Home (Profil + Beitragsliste)
- `/[dtag]/` → PostView (kanonische Form)
- `/tag/[name]/` → TagView
- `/impressum/` → Impressum

**Legacy-Normalisierung:** Pfade der Form `/YYYY/MM/DD/<dtag>.html/` werden beim Routing erkannt, via `history.replaceState` auf `/<dtag>/` umgeschrieben, danach die reguläre PostView-Route aufgerufen. Kein HTTP-Redirect nötig — rein clientseitig.

### Relay-Konfiguration

Relay-Liste kommt aus dem NIP-65-Outbox-Event (`kind:10002`) des Autors. Das Event wird einmalig manuell publiziert (siehe Publish-Spec, Abschnitt „Pre-Flight-Setup") und enthält die bevorzugten Read- und Write-Relays.

**Auflösung zur Laufzeit:**
1. SPA kennt genau einen hartcodierten **Bootstrap-Relay** (`wss://relay.damus.io`).
2. Beim Boot: SPA fragt Bootstrap-Relay nach `{ kinds:[10002], authors:[PUBKEY] }`.
3. Aus dem Event werden die `["r", <url>]`-Tags extrahiert (Read-Relays für die SPA-Abfragen).
4. Diese Liste wird für alle weiteren Nostr-Requests genutzt.

**Fallback:** Falls Bootstrap-Relay nicht antwortet oder `kind:10002` nicht existiert, nutzt die SPA eine hartcodierte Fallback-Liste.

```ts
// src/lib/nostr/config.ts
export const BOOTSTRAP_RELAY = 'wss://relay.damus.io'

// TODO bei Implementierung: npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9
// in hex decodieren (nip19.decode) und hier eintragen.
export const AUTHOR_PUBKEY_HEX = '<hex wird bei Implementierung aus npub abgeleitet>'

// Nur Fallback: wenn kind:10002 nicht geladen werden kann.
export const FALLBACK_READ_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
]
```

**Vorteil:** Änderungen an der Relay-Liste (z. B. späteres Hinzufügen eines eigenen Relays) erfordern nur ein neues `kind:10002`-Event, keinen Code-Deploy.

Blossom-Server-Liste wird analog aus `kind:10063` (BUD-03) aufgelöst — siehe Publish-Spec für das normative Schema beider Events.

---

## 3. SPA-Komponenten & Datenfluss

### Stack

- **Framework:** SvelteKit, Adapter `adapter-static`, `ssr: false`, Prerender-Disabled.
- **Nostr-SDK:** `applesauce-relay`, `applesauce-loaders`, `applesauce-signers` (höherstufig, RxJS-basiert, tree-shakable).
- **Markdown-Rendering:** `marked` + `DOMPurify` + `highlight.js` (3–5 Sprachen registriert).
- **Signing:** NIP-07 (Browser-Extension wie Alby oder nos2x).

### Dateistruktur

```
src/
├── app.html                        # SPA-Shell <head>-Defaults
├── lib/
│   ├── nostr/
│   │   ├── config.ts               # Relays, Pubkey
│   │   ├── pool.ts                 # RelayPool Singleton (applesauce-relay)
│   │   ├── loaders.ts              # loadPostList, loadPost, loadReplies, loadReactions
│   │   ├── signer.ts               # NIP-07 Wrapper (applesauce-signers)
│   │   └── outbox.ts               # NIP-65 Read-Relay-Resolution für fremde Autoren
│   ├── render/
│   │   ├── markdown.ts             # renderMarkdown(md: string): string — SINGLE EXPORT
│   │   └── naddr.ts                # nip19.naddrEncode Helper
│   └── components/
│       ├── PostCard.svelte
│       ├── PostView.svelte
│       ├── ReplyList.svelte
│       ├── Reactions.svelte
│       └── ReplyComposer.svelte
└── routes/
    ├── +layout.svelte
    ├── +page.svelte
    ├── archives/+page.svelte
    ├── tag/[name]/+page.svelte
    ├── impressum/+page.svelte
    └── [year]/[month]/[day]/[dtag=html_extension]/+page.svelte  # s. Hinweis unten
```

### Datenfluss: Post-Seite

1. Browser ruft `/2024/01/26/offenheit-das-wesentliche.html/` auf.
2. All-Inkl `.htaccess` → `/index.html` (Fallback, keine Datei unter dem Pfad).
3. SPA bootet, SvelteKit-Router matcht Route, extrahiert `dtag`.
4. `loadPost(dtag)` fragt via `applesauce-loaders` den `RelayPool` mit Filter `{ kinds:[30023], authors:[PUBKEY], '#d':[dtag] }`.
5. Observable emittiert Event (bei Versionen: neueste gewinnt, replaceable-Semantik via `applesauce`).
6. `renderMarkdown(event.content)` → sanitized HTML → `{@html}` in `PostView`.
7. Parallel: `loadReplies(event)` (kind:1 mit `#a` oder `#e`) und `loadReactions(event)` (kind:7), nonblocking.

### Datenfluss: Home/Archiv

```
loadPostList() → req({ kinds:[30023], authors:[PUBKEY], limit:100 })
  → Observable streamt Events
  → Dedup per d-Tag, sortiert nach published_at desc
  → PostCard-Liste rendert reaktiv
```

### Datenfluss: Kommentar schreiben (NIP-07)

```
ReplyComposer öffnet
  → signer.getPublicKey()   # Alby/nos2x prompted ggf.
  → User tippt, klickt Senden
  → Event bauen (kind:1, Tags: ['a', addr], ['e', eventId], ['p', authorPk])
  → signer.signEvent(event) # Extension prompted zur Freigabe
  → pool.publish(writeRelays, signedEvent)
  → bestehende ReplyList-Subscription zeigt Event optimistisch sofort an
```

`writeRelays` kommt bevorzugt aus dem NIP-65-Outbox-Event des Signers; Fallback: `READ_RELAYS`.

### State-Management

RxJS-Observables direkt in Svelte konsumiert:

```svelte
<script>
  import { loadPost } from '$lib/nostr/loaders'
  export let data
  const post$ = loadPost(data.dtag)
</script>

{#if $post$}
  <article class="prose">{@html renderMarkdown($post$.content)}</article>
{:else}
  <p>Lade …</p>
{/if}
```

Keine separaten Svelte-Stores. Observable ist der Store.

### Fehler- und Loading-Zustände

- **Soft-Timeout 8s:** „noch am Suchen …".
- **Hard-Timeout 15s:** Fallback-Hinweis mit Habla-Deeplink (`https://habla.news/a/<naddr>`).
- **Kein Event gefunden:** 404-Komponente mit Habla-Link.
- **Alle Relays offline:** Banner + Retry-Button.
- **Replies/Reactions:** best-effort, Fehler silently — dürfen die Post-Anzeige nicht blockieren.

### Markdown-Rendering (Isolation für Zukunft)

Alles Rendering-Zeug in `src/lib/render/markdown.ts`. Externer Export genau eine Funktion:

```ts
export function renderMarkdown(md: string): string
```

Kein Import von `marked` oder `DOMPurify` außerhalb dieser Datei. Das macht Austausch (z. B. zu `svelte-markdown`, `markdown-it` oder `unified`) später zu einem lokal begrenzten Refactor.

Implementierung (Skizze):

```ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('bash', bash)

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    code(code, lang) {
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value
      return `<pre><code class="hljs language-${lang ?? ''}">${highlighted}</code></pre>`
    },
    link(href, title, text) {
      const internal = href?.startsWith('/') || href?.includes('joerg-lohrer.de')
      const attrs = internal ? '' : ' target="_blank" rel="noopener"'
      return `<a href="${href}"${attrs}>${text}</a>`
    },
  },
})

export function renderMarkdown(md: string): string {
  const raw = marked.parse(md) as string
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] })
}
```

### Sicherheit

- **DOMPurify für allen gerenderten Content** — Hauptposts (von dir signiert) und Replies (von Dritten).
- **Pubkey-Whitelist:** PostsLoader filtert strikt auf `authors:[PUBKEY]`. Fremde Events für Hauptinhalte nicht anzeigen. Replies/Reactions explizit ausgenommen, aber sanitized.
- **Privat-Key liegt nie im Bundle, nicht auf All-Inkl, nicht im Browser.** Signieren ausschließlich lokal (Publish-Spec) oder via NIP-07 (Besucher-Kommentare).

### Bundle-Budget

Schätzung gzip:

- SvelteKit Runtime: ~15 KB
- applesauce-relay + -loaders + -signers: ~30 KB
- rxjs (tree-shaken): ~15 KB
- marked + DOMPurify: ~25 KB
- highlight.js Core + 3 Sprachen: ~15 KB
- App-Code: ~10 KB
- **Total: ~110 KB gzip** — vertretbar.

---

## 4. Hosting, Deployment, Migrationspfad

### Warum Webspace für SvelteKit ausreicht

Häufige Sorge: „kann mein einfaches Webspace-Paket eine SvelteKit-App hosten, ich habe ja keinen vServer und kein SSH?" Antwort: ja, problemlos. Hier warum.

**SvelteKit produziert reine statische Dateien.** Mit dem `adapter-static` (siehe §3) erzeugt `npm run build` einen Ordner `build/`, der nichts anderes enthält als:

- `index.html` — eine HTML-Datei
- `_app/` mit JS/CSS-Bundles — kompilierte Dateien
- weitere statische Files (favicon etc.)

Das ist exakt das gleiche Material, das Hugo bisher in `public/` produziert hat — nur mit JS statt vielen einzelnen HTML-Seiten. **Beides ist statisches Hosting, beides funktioniert auf jedem Webspace, der HTML ausliefern kann.**

**Was du brauchst:**
- Ordner zum Hochladen ✅ (jeder Webspace)
- Webserver, der HTML/JS/CSS ausliefert ✅ (jeder Webspace)
- Apache mit `mod_rewrite` für SPA-Fallback (eine `.htaccess`) ✅ (All-Inkl-Standard)

**Was du nicht brauchst:**
- ❌ Node.js auf dem Server
- ❌ Datenbank
- ❌ vServer/SSH (für *Hosting* nicht; SSH wird nur für komfortablen *Upload* via rsync genutzt — FTP funktioniert genauso)
- ❌ irgendetwas, das dauerhaft serverseitig läuft

**Unterschied Hugo vs. SvelteKit aus Server-Sicht:**

- Hugo erzeugt **viele HTML-Dateien**, eine pro Post. Server liefert pro URL eine spezifische Datei.
- SvelteKit (SPA) erzeugt **eine HTML-Datei** und ein JS-Bundle. Server liefert immer dieselben Dateien, der Browser entscheidet per JavaScript, was angezeigt wird (basierend auf der URL).

Für den Server ist Variante 2 sogar **simpler** — er hat weniger Dateien zu verwalten und muss nichts dynamisch generieren.

**Was die `.htaccess` macht:** wenn jemand `https://joerg-lohrer.de/2025/03/04/dezentrale-oep-oer.html/` aufruft, gibt es diese Datei nicht physisch auf dem Server — der Pfad ist eine virtuelle SPA-Route. Apache würde 404 antworten. Eine kleine `.htaccess`-Datei sagt Apache: „wenn die angeforderte Datei nicht existiert, liefere `/index.html` aus." Browser bekommt die SPA-Shell, JavaScript liest die URL, lädt das richtige Event vom Relay, rendert den Post.

**Was am Ende auf dem Webspace liegt** (siehe Dateistruktur weiter unten): ungefähr 30–80 Dateien, zusammen 100–200 KB. Weniger als ein einziges Foto. Komplett statisch, kein Backend.

### Hosting bei All-Inkl

Webhosting-Paket, Standardfeatures:

- statische Dateiauslieferung
- `mod_rewrite` (Standard)
- HTTPS (Let's Encrypt inklusive, ggf. schon aktiv)

Keine PHP, kein MySQL, keine Cronjobs, kein Backend.

### Dateistruktur auf Webspace

```
/
├── index.html                        # SPA-Shell
├── _app/                             # SvelteKit-Bundle
├── .htaccess
├── robots.txt
├── favicon.ico
├── impressum/
│   └── index.html                    # statische HTML-Datei
├── 2024/01/26/offenheit-das-wesentliche.html/
│   ├── bild1.jpeg                    # Altbilder
│   └── bild2.jpeg
├── 2023/03/23/gleichnis-vom-saemann.html/
│   └── …
└── …
```

### Upload-Mechanik

- **SvelteKit-Bundle:** `npm run build` → `build/` → rsync/FTP in Webspace-Root. npm-Script `deploy`.
- **Altbilder:** einmalig per rsync aus `content/posts/` an die Permalink-Pfade übertragen.
- **Neue Bilder:** nicht auf All-Inkl (Phase 2, Blossom-Upload via Publish-Spec).

**Credentials:** FTP-Login in `.env` des lokalen Repos, nicht committed.

### Migrationspfad (die 18 bestehenden Posts)

Um Verwechslung mit den „Phasen" im Evolutionspfad (Abschnitt 5) zu vermeiden, werden die Migrationsschritte mit **Schritt A–E** bezeichnet.

**Schritt A — Pre-Launch:**
Hugo-Seite bleibt live, nichts anfassen.

**Schritt B — SPA entwickeln:**
Lokal bauen, gegen Public-Relays mit Test-Events validieren.

**Schritt C — Posts als Events publizieren (Publish-Spec):**
Alle 18 `.md` zu `kind:30023` signieren und zu 4–5 Public-Relays pushen.
`d`-Tag = bisheriger Hugo-Slug; `published_at` = Frontmatter-Datum.
Verifikation: Events in Habla-Client gegenchecken.

**Schritt D — Cutover:**
1. Altbilder in Permalink-Pfade hochladen.
2. SPA-Bundle in Webspace-Root deployen.
3. `index.html` und `.htaccess` ersetzen (alte Hugo-Version wird überschrieben).
4. Alte, nicht mehr benötigte Hugo-Artefakte können bleiben oder gelöscht werden; `.htaccess`-Fallback macht sie harmlos.

**Schritt E — Validierung:**
- Alle 18 URLs im Browser prüfen (Inhalt stimmt, Bilder laden).
- Stichprobenhaft `curl -A "Mozilla/5.0" <url>` → Shell wird ausgeliefert.
- Link auf Mastodon posten → Preview fehlt (erwartet im Minimal-Launch).

**Rollback-Fähigkeit:**
Alter Hugo-`public/`-Stand als ZIP lokal archivieren. Rollback = zurückkopieren.

### URL-Kompatibilität (verifiziert)

Hugo-URL: `https://joerg-lohrer.de/2024/01/26/offenheit-das-wesentliche.html/`
Neu: Pfad existiert nicht als Datei → `.htaccess` → `/index.html` → SPA routed via `dtag`.
Für externe Links: identische URL, identische Inhaltsanzeige. Backlinks aus Mastodon, Google, Bookmarks funktionieren weiter.

---

## 5. Testing, Risiken, Evolution

### Testing-Strategie

**Unit-Tests (Vitest):**
- `renderMarkdown()`: Input/Output, XSS-Vektoren (`javascript:`-URLs, `<script>` in Content).
- `naddr`-Encoder: Pubkey + Kind + d-Tag → erwarteter Bech32-String.
- URL-Parser: `/2024/01/26/foo.html/` → `{ dtag: 'foo' }`.

**Integration-Tests:**
- Mock-Relay (in-memory Fake oder `nostr-relay-tray` in Testmodus).
- PostsLoader: mehrere Versionen desselben `d`-Tags → neueste wins.
- Signer: Test-Key signiert, PostLoader ruft ab, Inhalt matcht.

**End-to-End (Playwright):**
- Happy Path: Start → Liste → Klick → Post rendert.
- Deep-Link: `/2024/01/26/offenheit-das-wesentliche.html/` direkt.
- Kommentar mit Mock-NIP-07-Signer.

**Manuelle Tests vor Go-Live:**
- Alle 18 Post-URLs durchklicken, Visual-Parity-Check gegen alte Hugo-Seite.
- `curl`-Tests mit verschiedenen User-Agents.
- Offline-Fall: WLAN aus → Fehlermeldung lesbar, Habla-Fallback verfügbar.
- Reales NIP-07-Kommentar via Alby auf Test-Post.

### Risiken & Mitigationen

| Risiko | Wahrsch. | Auswirkung | Mitigation |
|---|---|---|---|
| Public-Relays alle down | niedrig | hoch | 4–5 Relays parallel, Timeout-UI, Habla-Fallback |
| Relay löscht Events | niedrig | mittel | Mehrere Relays, bezahltes nostr.wine als Anker |
| Dependency-Break | mittel | hoch | `package-lock.json` committen, `npm ci`, Staging vor Prod |
| `.htaccess` rewritet Bilder irrtümlich | niedrig | mittel | Regel prüft `-f` vor Fallback |
| Google-Rankings brechen | **hoch** | **mittel** | Akzeptiert; Stubs in Phase 3 nachrüstbar |
| Mastodon-Preview leer | **hoch** | **niedrig** | Akzeptiert; Teaser-Text im Toot kompensiert |
| XSS über Reply | niedrig | hoch | DOMPurify ohne Ausnahmen |
| All-Inkl ändert Apache-Config | sehr niedrig | mittel | Support-Ticket, Standard-Feature |
| Privat-Key-Leak | niedrig | **katastrophal** | Key niemals in Repo, Bundle, Server. Evtl. NIP-46 Bunker |
| Reaktions-Spam | mittel | niedrig | Aggregiert anzeigen, Author-Blocklist |

### Nicht Teil dieser Spec

- **Publish-Pipeline** (Signieren, Upload, GitHub Action): separate Spec. Diese Spec definiert nur Event- und URL-Kontrakt.
- **Eigener Relay/Blossom:** Evolutionspfad, nicht jetzt.
- **Impressum-Text:** rechtliche Inhalte, Umsetzung.
- **Visuelles Design:** Orientierung an PaperMod, Details in Implementation.

### Evolutionspfad

**Phase 1 (jetzt):** Minimal-Launch. SPA auf All-Inkl, Public-Relays, Altbilder auf All-Inkl, Kommentare via NIP-07. Kein SEO, keine Social-Previews.

**Phase 2 (nah):** Blossom für neue Bilder (public Blossom-Server, BUD-03-Multi-Upload, eine URL im Markdown). SPA unverändert.

**Phase 3 (bei Bedarf):** Meta-Stubs nachrüsten für SEO/Social-Previews. Publish-Pipeline erweitern, SPA unverändert.

**Phase 4 (ideologisch):** Eigener strfry-Relay (Homeserver oder VPS), zu Publish-Liste und SPA-Read-Liste hinzu.

**Phase 5 (vollständig dezentral):** Eigener Blossom-Server. Neue Posts uploaden dorthin, alte optional migrieren.

Jeder Phasenwechsel: additiv oder lokal begrenzter Refactor, kein Rewrite.

### Daten-Transparenz vs. defensive Korrektur

Die SPA soll Events **wahrheitsgetreu** rendern und **nicht still Daten korrigieren**. Wenn ein Event Auffälligkeiten enthält (doppelte `t`-Tags, leeres `d`, inkonsistente Groß-/Kleinschreibung gegenüber anderen Events desselben Autors), soll die SPA das sichtbar lassen — nicht transparent wegdedupen. Grund: der Autor merkt sonst nicht, dass seine Events Daten-Mängel haben.

Daten-Bereinigung gehört in **separate Audit-Werkzeuge** (siehe Publish-Spec, z. B. künftiger `deno task audit`), die auf Basis von Relay-Queries einen Report erstellen und mögliche Korrektur-Commits in den Markdown-Quelltext vorschlagen.

Der Mini-SPA-Spike (`preview/spa-mini/`) dedup'te pragmatisch; die produktive SPA tut das nicht.

### Success-Kriterien Phase 1

- Alle 18 alten Post-URLs liefern korrekten Inhalt (Visual-Parity, nicht pixelgenau).
- Neuer Post publizieren (Publish-Spec) < 30 s lokal.
- First Contentful Paint < 1,5 s auf Desktop/LAN.
- Time-to-Post-Rendered < 3 s (Shell + Relay + Event + Rendering).
- Lighthouse Accessibility > 90.
- NIP-07-Kommentar funktioniert in Chrome + Firefox mit Alby.

---

## Anhang: Begriffe

- **NIP-23:** Nostr-Langform-Events, `kind:30023`, replaceable per `d`-Tag.
- **NIP-07:** Browser-Extension-Signer-Protokoll (Alby, nos2x, Flamingo).
- **NIP-65:** Outbox-Model, `kind:10002`, definiert Read/Write-Relays pro Autor.
- **naddr:** Bech32-kodierter Pointer auf ein parameterized-replaceable Event (Pubkey + Kind + d-Tag + Relays).
- **Blossom:** Content-addressed Blob-Hosting für Nostr, Dateien über SHA256-Hash adressiert.
- **BUD-03:** Blossom-User-Description-03, Multi-Server-Mirror-Spezifikation.
- **Replaceable Event:** Event, das alte Versionen mit gleichem (Pubkey, Kind, d-Tag) ersetzt. Relays halten nur die neueste Version.
