import { writable, type Readable } from 'svelte/store';
import { loadOutboxRelays, readUrls } from '$lib/nostr/relays';
import { FALLBACK_READ_RELAYS } from '$lib/nostr/config';

/**
 * Store mit der aktuellen Read-Relay-Liste.
 * Initial = FALLBACK_READ_RELAYS, damit die SPA sofort abfragen kann;
 * sobald loadOutboxRelays() fertig ist, wird der Store aktualisiert.
 *
 * Singleton-Initialisierung: bootstrapReadRelays() ist idempotent und wird
 * vom ersten relay-zugriff (loaders, reply-composer) angestossen — nicht
 * mehr vom layout, damit der relay-code nicht auf jeder seite im
 * initialen bundle haengt.
 */
const store = writable<string[]>([...FALLBACK_READ_RELAYS]);
let bootstrapped = false;

export function bootstrapReadRelays(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  loadOutboxRelays()
    .then((relays) => {
      const urls = readUrls(relays);
      if (urls.length > 0) store.set(urls);
    })
    .catch(() => {
      // Store behält seinen initialen FALLBACK-Zustand
    });
}

export const readRelays: Readable<string[]> = store;
