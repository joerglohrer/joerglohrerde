import type { SignedEvent } from './types.ts'

export function filterDeleted(
  events: SignedEvent[],
  deletions: SignedEvent[],
  authorPubkey: string,
): SignedEvent[] {
  const deletedAtByCoord = new Map<string, number>()
  for (const del of deletions) {
    if (del.kind !== 5) continue
    if (del.pubkey !== authorPubkey) continue
    for (const tag of del.tags) {
      if (tag[0] !== 'a' || !tag[1]) continue
      const previous = deletedAtByCoord.get(tag[1])
      if (previous === undefined || del.created_at > previous) {
        deletedAtByCoord.set(tag[1], del.created_at)
      }
    }
  }
  return events.filter((ev) => {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) return true
    const coord = `${ev.kind}:${ev.pubkey}:${d}`
    const deletedAt = deletedAtByCoord.get(coord)
    return deletedAt === undefined || ev.created_at > deletedAt
  })
}
