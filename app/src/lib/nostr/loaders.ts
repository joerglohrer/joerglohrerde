import { get } from 'svelte/store';
import { lastValueFrom, timeout, toArray, EMPTY, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { NostrEvent } from 'applesauce-core/helpers/event';
import type { Filter as ApplesauceFilter } from 'applesauce-core/helpers/filter';
import { pool } from './pool';
import { readRelays } from '$lib/stores/readRelays';
import { AUTHOR_PUBKEY_HEX, RELAY_HARD_TIMEOUT_MS } from './config';

/** Re-export als sprechenden Alias */
export type { NostrEvent };

/** Profile-Content (kind:0) */
export interface Profile {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
}

type Filter = ApplesauceFilter;

interface CollectOpts {
  onEvent?: (ev: NostrEvent) => void;
  hardTimeoutMs?: number;
}

/**
 * Startet eine Request-Subscription und sammelt alle gelieferten Events
 * bis EOSE (pool.request completes nach EOSE) oder Hard-Timeout.
 */
async function collectEvents(
  relays: string[],
  filter: Filter,
  opts: CollectOpts = {}
): Promise<NostrEvent[]> {
  const events = await lastValueFrom(
    pool.request(relays, filter).pipe(
      tap((ev: NostrEvent) => opts.onEvent?.(ev)),
      timeout(opts.hardTimeoutMs ?? RELAY_HARD_TIMEOUT_MS),
      toArray(),
      catchError(() => EMPTY)
    ),
    { defaultValue: [] as NostrEvent[] }
  );
  return events;
}

/** Dedup per d-Tag: neueste (created_at) wins */
function dedupByDtag(events: NostrEvent[]): NostrEvent[] {
  const byDtag = new Map<string, NostrEvent>();
  for (const ev of events) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1];
    if (!d) continue;
    const existing = byDtag.get(d);
    if (!existing || ev.created_at > existing.created_at) {
      byDtag.set(d, ev);
    }
  }
  return [...byDtag.values()];
}

/** Alle kind:30023-Posts des Autors, neueste zuerst */
export async function loadPostList(
  onEvent?: (ev: NostrEvent) => void
): Promise<NostrEvent[]> {
  const relays = get(readRelays);
  const events = await collectEvents(
    relays,
    { kinds: [30023], authors: [AUTHOR_PUBKEY_HEX], limit: 200 },
    { onEvent }
  );
  const deduped = dedupByDtag(events);
  return deduped.sort((a, b) => {
    const ap = parseInt(
      a.tags.find((t) => t[0] === 'published_at')?.[1] ?? `${a.created_at}`,
      10
    );
    const bp = parseInt(
      b.tags.find((t) => t[0] === 'published_at')?.[1] ?? `${b.created_at}`,
      10
    );
    return bp - ap;
  });
}

/** Einzelpost per d-Tag */
export async function loadPost(dtag: string): Promise<NostrEvent | null> {
  const relays = get(readRelays);
  const events = await collectEvents(relays, {
    kinds: [30023],
    authors: [AUTHOR_PUBKEY_HEX],
    '#d': [dtag],
    limit: 1
  });
  if (events.length === 0) return null;
  return events.reduce((best, cur) =>
    cur.created_at > best.created_at ? cur : best
  );
}

/**
 * Profil-Event kind:0 (neueste Version).
 * Default: Autoren-Pubkey der SPA. Optional: beliebiger Pubkey für
 * die Anzeige fremder Kommentar-Autoren.
 */
export async function loadProfile(pubkey: string = AUTHOR_PUBKEY_HEX): Promise<Profile | null> {
  const relays = get(readRelays);
  const events = await collectEvents(relays, {
    kinds: [0],
    authors: [pubkey],
    limit: 1
  });
  if (events.length === 0) return null;
  const latest = events.reduce((best, cur) =>
    cur.created_at > best.created_at ? cur : best
  );
  try {
    return JSON.parse(latest.content) as Profile;
  } catch {
    return null;
  }
}

/** Post-Adresse im `a`-Tag-Format: "30023:<pubkey>:<dtag>" */
function eventAddress(pubkey: string, dtag: string): string {
  return `30023:${pubkey}:${dtag}`;
}

/**
 * Alle kind:1-Replies auf einen Post, chronologisch aufsteigend (älteste zuerst).
 * Streamt via onEvent, wenn angegeben.
 */
export async function loadReplies(
  dtag: string,
  onEvent?: (ev: NostrEvent) => void
): Promise<NostrEvent[]> {
  const relays = get(readRelays);
  const address = eventAddress(AUTHOR_PUBKEY_HEX, dtag);
  const events = await collectEvents(
    relays,
    { kinds: [1], '#a': [address], limit: 500 },
    { onEvent }
  );
  return events.sort((a, b) => a.created_at - b.created_at);
}

/**
 * Filtert Post-Liste clientseitig nach Tag-Name.
 * (Relay-seitige #t-Filter werden nicht von allen Relays unterstützt — safer
 * ist es, die ganze Liste zu laden und lokal zu filtern.)
 */
export async function loadPostsByTag(tagName: string): Promise<NostrEvent[]> {
  const all = await loadPostList();
  const norm = tagName.toLowerCase();
  return all.filter((ev) =>
    ev.tags.some((t) => t[0] === 't' && t[1]?.toLowerCase() === norm)
  );
}

export interface ReactionSummary {
  /** Emoji oder "+"/"-" */
  content: string;
  count: number;
}

/**
 * Aggregiert kind:7-Reactions auf einen Post.
 * Gruppiert nach content, zählt Anzahl.
 */
export async function loadReactions(dtag: string): Promise<ReactionSummary[]> {
  const relays = get(readRelays);
  const address = eventAddress(AUTHOR_PUBKEY_HEX, dtag);
  const events = await collectEvents(relays, {
    kinds: [7],
    '#a': [address],
    limit: 500
  });
  const counts = new Map<string, number>();
  for (const ev of events) {
    const key = ev.content || '+';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([content, count]) => ({ content, count }))
    .sort((a, b) => b.count - a.count);
}
