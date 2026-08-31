export interface CheckInput {
  relaysQueried: number
  relaysResponded: number
  /** Relays, die mindestens ein event geliefert haben (nicht nur geantwortet). */
  relaysWithEvents: number
  eventCount: number
  minEvents: number
  lastKnownGoodCount: number | undefined
  newDeletionsCount: number
  allowShrink: boolean
}

/** Untergrenze: unter zwei quellen ist der abgleich keine bestaetigung mehr. */
export const MIN_RELAYS_WITH_EVENTS = 2

export function runChecks(input: CheckInput): void {
  // Frueher: 60% der angefragten relays mussten antworten. Zwei probleme —
  // (1) der fetcher resolved bei timeout mit leerem array und zaehlt damit
  // als "geantwortet", die quote misst also erreichbarkeit statt daten;
  // (2) mit der groesseren union-liste aus loadReadRelays liefern regulaer
  // mehrere relays 0 events (gemessen 2026-08-31: 6 von 11), was die quote
  // ohne echten fehler reissen wuerde. Stattdessen absolute untergrenze an
  // relays, die wirklich events geliefert haben.
  if (input.relaysWithEvents < MIN_RELAYS_WITH_EVENTS) {
    throw new Error(
      `Relay-Quorum nicht erreicht: nur ${input.relaysWithEvents} relay(s) mit events ` +
        `(von ${input.relaysResponded}/${input.relaysQueried} antwortenden, ` +
        `brauche mindestens ${MIN_RELAYS_WITH_EVENTS})`,
    )
  }
  if (input.eventCount < input.minEvents) {
    throw new Error(
      `Event-Count ${input.eventCount} unter min-events ${input.minEvents}`,
    )
  }
  // Drop-Check: hard-fail bei jedem unerklaerten Event-Verlust > 20%.
  // Bedingung "drop > newDeletionsCount" heisst: ein einziges nicht durch
  // kind:5 abgedecktes verschwundenes event reicht zum fail. Bewusst strikt,
  // weil ein versehentlich verschwundener post schlimmer ist als ein
  // false-positive-failure (override mit --allow-shrink). Wer das tunen
  // will, sollte die bedingung auf "drop - newDeletionsCount > schwelle"
  // umstellen.
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
