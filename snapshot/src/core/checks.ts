export interface CheckInput {
  relaysQueried: number
  relaysResponded: number
  eventCount: number
  minEvents: number
  lastKnownGoodCount: number | undefined
  newDeletionsCount: number
  allowShrink: boolean
}

export function runChecks(input: CheckInput): void {
  const quorum = Math.ceil(input.relaysQueried * 0.6)
  if (input.relaysResponded < quorum) {
    throw new Error(
      `Relay-Quorum nicht erreicht: ${input.relaysResponded}/${input.relaysQueried} ` +
        `(brauche mindestens ${quorum})`,
    )
  }
  if (input.eventCount < input.minEvents) {
    throw new Error(
      `Event-Count ${input.eventCount} unter min-events ${input.minEvents}`,
    )
  }
  if (input.lastKnownGoodCount !== undefined && !input.allowShrink) {
    const drop = input.lastKnownGoodCount - input.eventCount
    const dropPct = drop / input.lastKnownGoodCount
    if (dropPct > 0.2 && drop > input.newDeletionsCount) {
      throw new Error(
        `Event-Count-Drop ${drop} (${(dropPct * 100).toFixed(0)}%) gegenueber ` +
          `last-known-good ${input.lastKnownGoodCount}, ` +
          `nur ${input.newDeletionsCount} korrespondierende kind:5. ` +
          `Override mit --allow-shrink falls bewusst.`,
      )
    }
  }
}
