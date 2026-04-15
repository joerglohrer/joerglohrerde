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

/** Fallback, falls kind:10002 nicht geladen werden kann */
export const FALLBACK_READ_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
];

/** Habla.news-Deep-Link-Basis (für Nutzer ohne JS oder wenn Events fehlen) */
export const HABLA_BASE = 'https://habla.news/a/';

/** Timeout-Werte in ms */
export const RELAY_TIMEOUT_MS = 8000;
export const RELAY_HARD_TIMEOUT_MS = 15000;
