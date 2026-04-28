import type { SignedEvent } from './types.ts'

export function dedupByDtag(events: SignedEvent[]): SignedEvent[] {
  const byDtag = new Map<string, SignedEvent>()
  // Bei gleicher created_at gewinnt das zuerst gesehene event (relay-delivery-
  // reihenfolge ist nicht-deterministisch, equal-timestamp = aequivalent).
  for (const ev of events) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    if (!d) continue
    const existing = byDtag.get(d)
    if (!existing || ev.created_at > existing.created_at) {
      byDtag.set(d, ev)
    }
  }
  return [...byDtag.values()]
}
