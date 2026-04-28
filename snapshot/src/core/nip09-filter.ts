import type { SignedEvent } from './types.ts'

export function filterDeleted(
  events: SignedEvent[],
  deletions: SignedEvent[],
  authorPubkey: string,
): SignedEvent[] {
  const deletedCoords = new Set<string>()
  for (const del of deletions) {
    if (del.kind !== 5) continue
    if (del.pubkey !== authorPubkey) continue
    for (const tag of del.tags) {
      if (tag[0] === 'a' && tag[1]) deletedCoords.add(tag[1])
    }
  }
  return events.filter((ev) => {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) return true
    const coord = `${ev.kind}:${ev.pubkey}:${d}`
    return !deletedCoords.has(coord)
  })
}
