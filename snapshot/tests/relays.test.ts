import { assertEquals } from '@std/assert'
import {
  extractReadRelays,
  type RelayListLoader,
  loadReadRelays,
  normalizeRelayUrl,
} from '../src/core/relays.ts'
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

Deno.test('loadReadRelays: kind:10002-relays stehen vorn, fallback haengt an', async () => {
  const loader: RelayListLoader = async () => KIND_10002
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, ['wss://fallback'])
  assertEquals(relays, ['wss://relay.damus.io', 'wss://nos.lol', 'wss://fallback'])
})

Deno.test('normalizeRelayUrl: trailing slash und case werden vereinheitlicht', () => {
  assertEquals(normalizeRelayUrl('wss://NOS.lol/'), 'wss://nos.lol')
  assertEquals(normalizeRelayUrl('wss://nos.lol'), 'wss://nos.lol')
  assertEquals(normalizeRelayUrl('  wss://nos.lol/  '), 'wss://nos.lol')
})

Deno.test('loadReadRelays: union aus kind:10002 UND fallback', async () => {
  // Regression fuer den 404 von protocol-anthropology: das event lag nur auf
  // einem relay, das je nach codepfad nicht abgefragt wurde. Union statt
  // entweder-oder.
  const loader: RelayListLoader = async () => KIND_10002
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, [
    'wss://relay.primal.net',
    'wss://nos.lol',
  ])
  assertEquals(relays, [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
  ])
})

Deno.test('loadReadRelays: union dedupliziert ueber normalisierung', async () => {
  const withSlash: SignedEvent = { ...KIND_10002, tags: [['r', 'wss://nos.lol/']] }
  const loader: RelayListLoader = async () => withSlash
  const relays = await loadReadRelays('wss://bootstrap', 'P', loader, ['wss://nos.lol'])
  assertEquals(relays, ['wss://nos.lol'])
})
