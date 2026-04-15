import { lastValueFrom, timeout, toArray, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { NostrEvent } from 'applesauce-core/helpers/event';
import { pool } from './pool';
import {
  AUTHOR_PUBKEY_HEX,
  BOOTSTRAP_RELAY,
  FALLBACK_READ_RELAYS,
  RELAY_TIMEOUT_MS
} from './config';

export interface OutboxRelay {
  url: string;
  /** true = zum Lesen zu nutzen (kein dritter Tag-Wert oder "read") */
  read: boolean;
  /** true = zum Schreiben zu nutzen (kein dritter Tag-Wert oder "write") */
  write: boolean;
}

/**
 * Lädt die NIP-65-Relay-Liste (kind:10002) des Autors vom Bootstrap-Relay.
 * Fallback auf FALLBACK_READ_RELAYS, wenn das Event nicht innerhalb von
 * RELAY_TIMEOUT_MS gefunden wird.
 *
 * Interpretation des dritten Tag-Werts:
 * - nicht gesetzt → read + write
 * - "read" → nur read
 * - "write" → nur write
 */
export async function loadOutboxRelays(): Promise<OutboxRelay[]> {
  const event = await firstEvent();

  if (!event) {
    return FALLBACK_READ_RELAYS.map((url) => ({ url, read: true, write: true }));
  }

  const relays: OutboxRelay[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'r' || !tag[1]) continue;
    const mode = tag[2];
    relays.push({
      url: tag[1],
      read: mode !== 'write',
      write: mode !== 'read'
    });
  }

  if (relays.length === 0) {
    return FALLBACK_READ_RELAYS.map((url) => ({ url, read: true, write: true }));
  }

  return relays;
}

/** Nur die Read-URLs aus OutboxRelay[] */
export function readUrls(relays: OutboxRelay[]): string[] {
  return relays.filter((r) => r.read).map((r) => r.url);
}

/** Nur die Write-URLs aus OutboxRelay[] */
export function writeUrls(relays: OutboxRelay[]): string[] {
  return relays.filter((r) => r.write).map((r) => r.url);
}

// ---------- Internes --------------------------------------------------------

/**
 * Fragt das neueste kind:10002-Event vom Bootstrap-Relay ab.
 * Sammelt alle Events bis EOSE (`pool.request(...)` emittiert nur Events
 * und completes bei EOSE), nimmt das neueste, oder null falls keines.
 */
async function firstEvent(): Promise<NostrEvent | null> {
  try {
    const events = await lastValueFrom(
      pool
        .request([BOOTSTRAP_RELAY], {
          kinds: [10002],
          authors: [AUTHOR_PUBKEY_HEX],
          limit: 1
        })
        .pipe(
          timeout(RELAY_TIMEOUT_MS),
          toArray(),
          catchError(() => EMPTY)
        ),
      { defaultValue: [] as NostrEvent[] }
    );
    if (events.length === 0) return null;
    return events.reduce((best, cur) =>
      cur.created_at > best.created_at ? cur : best
    );
  } catch {
    return null;
  }
}
