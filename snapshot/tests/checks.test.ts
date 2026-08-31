import { assertEquals, assertThrows } from '@std/assert'
import { runChecks } from '../src/core/checks.ts'

Deno.test('runChecks: nur ein relay mit events -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 11, relaysResponded: 11, relaysWithEvents: 1,
      eventCount: 27, minEvents: 1, lastKnownGoodCount: undefined,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'Relay-Quorum',
  )
})

Deno.test('runChecks: viele tote relays, aber 2 mit events -> ok', () => {
  // Reale lage 2026-08-31: von 11 relays lieferten nur nos.lol und
  // relay.tchncs.de events, der rest antwortete leer. Das ist kein
  // fehlerfall — die 60%-antwortquote war das falsche mass.
  runChecks({
    relaysQueried: 11, relaysResponded: 11, relaysWithEvents: 2,
    eventCount: 27, minEvents: 1, lastKnownGoodCount: undefined,
    newDeletionsCount: 0, allowShrink: false,
  })
})

Deno.test('runChecks: event-count unter min-events -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 5, relaysResponded: 5, relaysWithEvents: 5,
      eventCount: 0, minEvents: 1, lastKnownGoodCount: undefined,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'min-events',
  )
})

Deno.test('runChecks: drop > 20% ohne kind:5 -> hard-fail', () => {
  assertThrows(
    () => runChecks({
      relaysQueried: 5, relaysResponded: 5, relaysWithEvents: 5,
      eventCount: 20, minEvents: 1, lastKnownGoodCount: 27,
      newDeletionsCount: 0, allowShrink: false,
    }),
    Error, 'Event-Count-Drop',
  )
})

Deno.test('runChecks: drop > 20% mit korrespondierenden kind:5 -> ok', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5, relaysWithEvents: 5,
    eventCount: 20, minEvents: 1, lastKnownGoodCount: 27,
    newDeletionsCount: 7, allowShrink: false,
  })
})

Deno.test('runChecks: --allow-shrink umgeht drop-check', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5, relaysWithEvents: 5,
    eventCount: 1, minEvents: 1, lastKnownGoodCount: 27,
    newDeletionsCount: 0, allowShrink: true,
  })
})

Deno.test('runChecks: erstlauf ohne cache + min-events=1 -> ok', () => {
  runChecks({
    relaysQueried: 5, relaysResponded: 5, relaysWithEvents: 5,
    eventCount: 1, minEvents: 1, lastKnownGoodCount: undefined,
    newDeletionsCount: 0, allowShrink: false,
  })
})
