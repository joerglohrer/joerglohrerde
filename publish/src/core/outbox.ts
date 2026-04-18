import { Relay } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'
import type { SignedEvent } from './relays.ts'

export interface Outbox {
  read: string[]
  write: string[]
}

export function parseOutbox(ev: { tags: string[][] }): Outbox {
  const read: string[] = []
  const write: string[] = []
  for (const t of ev.tags) {
    if (t[0] !== 'r' || !t[1]) continue
    const marker = t[2]
    if (marker === 'read') read.push(t[1])
    else if (marker === 'write') write.push(t[1])
    else {
      read.push(t[1])
      write.push(t[1])
    }
  }
  return { read, write }
}

export async function loadOutbox(
  bootstrapRelay: string,
  authorPubkeyHex: string,
): Promise<Outbox> {
  const relay = new Relay(bootstrapRelay)
  const ev = await firstValueFrom(
    relay
      .request({ kinds: [10002], authors: [authorPubkeyHex], limit: 1 })
      .pipe(timeout({ first: 10_000 })),
  ) as SignedEvent
  return parseOutbox(ev)
}
