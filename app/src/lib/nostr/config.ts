/**
 * Nostr-Konfiguration der SPA.
 *
 * Wichtig: Der AUTHOR_PUBKEY_HEX muss synchron zum tatsächlichen
 * Autorenkonto sein (siehe docs/superpowers/specs/2026-04-15-nostr-page-design.md).
 */

/** npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9 in hex */
export const AUTHOR_PUBKEY_HEX =
  '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41';

/** Bootstrap-Relay für das initiale Lesen von kind:10002 */
export const BOOTSTRAP_RELAY = 'wss://relay.damus.io';

/**
 * Fallback, falls kind:10002 nicht geladen werden kann.
 * Bootstrap-Relay ist bewusst als erster Eintrag Teil der Liste — ein Ort der Wahrheit.
 */
export const FALLBACK_READ_RELAYS = [
  BOOTSTRAP_RELAY,
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
] as const;

/**
 * Habla.news-Route für Addressable Events — URL endet auf `/a/`, der
 * vollständige Deep-Link wird durch Anhängen des `naddr1…`-Bech32 gebildet.
 */
export const HABLA_BASE = 'https://habla.news/a/';

/** Soft-Timeout: einzelne Relay-Abfrage darf nicht länger als diese Dauer blockieren. */
export const RELAY_TIMEOUT_MS = 8000;

/** Hard-Timeout: Page-Budget, nach dem eine Route-Abfrage endgültig abbricht. */
export const RELAY_HARD_TIMEOUT_MS = 15000;
