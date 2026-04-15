import { RelayPool } from 'applesauce-relay';

/**
 * Singleton-Pool für alle Nostr-Requests der SPA.
 * applesauce-relay verwaltet Reconnects, Subscriptions, deduping intern.
 */
export const pool = new RelayPool();
