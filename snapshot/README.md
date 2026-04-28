# snapshot/

Liest die `kind:30023`-Events des Site-Autors von den Read-Relays und
schreibt sie als JSON-Artefakte für den SvelteKit-Prerender-Schritt.
Kein Live-Proxy: Relays werden nur zur Build-Zeit befragt.

Spec: [`../docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md`](../docs/superpowers/specs/2026-04-21-prerender-snapshot-design.md)

## Nutzung

```sh
cd snapshot
deno task snapshot                    # default
deno task snapshot --out ./output     # alternatives Ziel
deno task snapshot --min-events 20    # Schwelle
deno task snapshot --allow-shrink     # Drop-Check aus
```

Erwartet diese Env-Vars (aus `../.env.local`):

- `AUTHOR_PUBKEY_HEX` (64 hex chars)
- `BOOTSTRAP_RELAY` (wss-URL)
