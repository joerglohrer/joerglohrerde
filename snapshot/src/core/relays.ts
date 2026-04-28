import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './types.ts'

export type RelayListLoader = (
  bootstrapRelay: string,
  authorPubkey: string,
) => Promise<SignedEvent | undefined>

export const FALLBACK_READ_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.tchncs.de',
  'wss://relay.edufeed.org',
]

export function extractReadRelays(kind10002: SignedEvent): string[] {
  const out: string[] = []
  for (const tag of kind10002.tags) {
    if (tag[0] !== 'r' || !tag[1]) continue
    const marker = tag[2]
    if (marker === 'write') continue
    out.push(tag[1])
  }
  return out
}

export const defaultRelayListLoader: RelayListLoader = async (bootstrap, pubkey) => {
  try {
    const relay = new Relay(bootstrap)
    const ev = await firstValueFrom(
      relay.request({ kinds: [10002], authors: [pubkey], limit: 1 })
        .pipe(timeout({ first: 5_000 })),
    )
    return ev as SignedEvent
  } catch {
    return undefined
  }
}

export async function loadReadRelays(
  bootstrapRelay: string,
  authorPubkey: string,
  loader: RelayListLoader = defaultRelayListLoader,
  fallback: string[] = FALLBACK_READ_RELAYS,
): Promise<string[]> {
  const ev = await loader(bootstrapRelay, authorPubkey)
  if (!ev) return fallback
  const list = extractReadRelays(ev)
  return list.length > 0 ? list : fallback
}

export interface FetchEventsResult {
  events: SignedEvent[]
  responded: string[]
  queried: string[]
}

export type EventFetcher = (relay: string, pubkey: string) => Promise<SignedEvent[]>

export const defaultEventFetcher: EventFetcher = async (relay, pubkey) => {
  const out: SignedEvent[] = []
  const r = new Relay(relay)
  return await new Promise<SignedEvent[]>((resolve) => {
    const sub = r.request({ kinds: [30023, 5], authors: [pubkey] })
      .pipe(timeout({ first: 10_000 }))
      .subscribe({
        next: (ev) => out.push(ev as SignedEvent),
        error: () => resolve(out),
        complete: () => resolve(out),
      })
    // Belt-and-suspenders: falls subscribe-callback weder error noch
    // complete feuert (z.B. timeout-operator wird intern verschluckt),
    // schliessen wir nach timeout+1s manuell. Resolve() kommt dann nicht
    // mehr durch (Promise schon settled), aber der Relay-Handle wird
    // entsorgt — kein leak.
    setTimeout(() => sub.unsubscribe(), 11_000)
  })
}

export async function fetchEvents(
  relays: string[],
  authorPubkey: string,
  fetcher: EventFetcher = defaultEventFetcher,
): Promise<FetchEventsResult> {
  const results = await Promise.all(
    relays.map(async (url) => {
      try {
        const events = await fetcher(url, authorPubkey)
        return { url, ok: true as const, events }
      } catch {
        return { url, ok: false as const, events: [] as SignedEvent[] }
      }
    }),
  )
  const events: SignedEvent[] = []
  for (const r of results) events.push(...r.events)
  return {
    events,
    responded: results.filter((r) => r.ok).map((r) => r.url),
    queried: relays,
  }
}
