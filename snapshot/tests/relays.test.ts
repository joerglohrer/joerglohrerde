import { assertEquals } from '@std/assert'
import { extractReadRelays, type RelayListLoader, loadReadRelays } from '../src/core/relays.ts'
import type { SignedEvent } from '../src/core/types.ts'

const KIND_10002: SignedEvent = {
  id: 'r', pubkey: 'P', created_at: 1, kind: 10002, sig: 's', content: '',
  tags: [
    ['r', 'wss://relay.damus.io'],
    ['r', 'wss://nos.lol', 'read'],
    ['r', 'wss://relay.write-only.example', 'write'],
  ],
}

Deno.test('extractReadRelays: ohne marker = read+write, "read" = read, "write" = nicht', () => {
  assertEquals(extractReadRelays(KIND_10002), [
    'wss://relay.damus.io',
    'wss://nos.lol',
  ])
})

Deno.test('loadReadRelays: nutzt fallback wenn kein kind:10002', async () => {
  const loader: RelayListLoader = async () => undefined
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, [
    'wss://fallback1', 'wss://fallback2',
  ])
  assertEquals(relays, ['wss://fallback1', 'wss://fallback2'])
})

Deno.test('loadReadRelays: nutzt kind:10002 wenn vorhanden', async () => {
  const loader: RelayListLoader = async () => KIND_10002
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, ['wss://fallback'])
  assertEquals(relays, ['wss://relay.damus.io', 'wss://nos.lol'])
})
