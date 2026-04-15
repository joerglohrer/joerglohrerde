# SPA Mini-Preview

**Tech-Spike, kein Produkt.**

Eine einzige `index.html`, die im Browser einen einzelnen Nostr-Post (`kind:30023`)
live von Public-Relays lädt und rendert. Beweist, dass die SPA-Architektur
aus [`docs/superpowers/specs/2026-04-15-nostr-page-design.md`](../../docs/superpowers/specs/2026-04-15-nostr-page-design.md)
in der Praxis funktioniert — ohne SvelteKit-Build, ohne Routing, ohne Backend.

## Was sie macht

- Lädt `nostr-tools`, `marked` und `DOMPurify` zur Laufzeit von esm.sh.
- Verbindet sich zu fünf Public-Relays.
- Holt das `kind:30023`-Event mit `d`-Tag `dezentrale-oep-oer` für den hartcodierten Pubkey.
- Rendert Markdown via `marked`, sanitized via `DOMPurify`.
- Cover-Bild wird vom Blossom-Server geladen (URL aus dem Event-Tag `image`).

## Was sie nicht macht

- Kein Routing, keine Post-Liste, keine Tags-Navigation, keine Reactions, keine Kommentare.
- Kein NIP-65-Outbox-Resolution (Relays sind hartcodiert).
- Kein NIP-07-Login.
- Kein Code-Splitting, keine Service-Worker, keine Optimierung.

Für all das wartet die echte SvelteKit-SPA — das hier ist nur das „Hello World".

## Lokal ausprobieren

Die Datei kann nicht per `file://` geöffnet werden (CORS für CDN-Imports).
Stattdessen ein lokaler HTTP-Server:

```sh
cd preview/spa-mini
python3 -m http.server 8000
# Browser: http://localhost:8000/
```

Oder mit Deno:

```sh
deno run --allow-net --allow-read jsr:@std/http/file-server preview/spa-mini
```

## Auf die Subdomain `spa.joerg-lohrer.de` deployen

Voraussetzung: Subdomain im All-Inkl-KAS angelegt, eigener DocumentRoot eingerichtet,
SSL-Zertifikat aktiviert.

Inhalt von `preview/spa-mini/` (also `index.html` und `.htaccess`) per FTP
in den DocumentRoot der Subdomain hochladen.

Erwartetes Ergebnis: `https://spa.joerg-lohrer.de/` zeigt den Post.

## Spätere Ablösung

Sobald die SvelteKit-SPA fertig ist, wird ihr `build/`-Output denselben Webroot
ablösen. Diese Mini-Seite kann dann gelöscht oder als historisches Artefakt
im Repo bleiben.
