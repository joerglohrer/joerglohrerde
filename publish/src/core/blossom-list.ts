import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './relays.ts'

export function parseBlossomServers(ev: { tags: string[][] }): string[] {
  return ev.tags
    .filter((t) => t[0] === 'server' && t[1])
    .map((t) => t[1].replace(/\/$/, ''))
}

export async function loadBlossomServers(
  bootstrapRelay: string,
  authorPubkeyHex: string,
): Promise<string[]> {
  const relay = new Relay(bootstrapRelay)
  const ev = await firstValueFrom(
    relay
      .request({ kinds: [10063], authors: [authorPubkeyHex], limit: 1 })
      .pipe(timeout({ first: 10_000 })),
  ) as SignedEvent
  return parseBlossomServers(ev)
}
