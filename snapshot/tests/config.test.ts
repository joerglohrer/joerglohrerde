import { assertEquals, assertThrows } from '@std/assert'
import { loadConfig } from '../src/core/config.ts'

Deno.test('loadConfig liest pubkey + bootstrap relay', () => {
  Deno.env.set('AUTHOR_PUBKEY_HEX', '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  const cfg = loadConfig()
  assertEquals(cfg.authorPubkeyHex, '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41')
  assertEquals(cfg.bootstrapRelay, 'wss://relay.primal.net')
})

Deno.test('loadConfig wirft bei fehlendem AUTHOR_PUBKEY_HEX', () => {
  Deno.env.delete('AUTHOR_PUBKEY_HEX')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  assertThrows(() => loadConfig(), Error, 'AUTHOR_PUBKEY_HEX')
})

Deno.test('loadConfig wirft bei ungueltigem hex', () => {
  Deno.env.set('AUTHOR_PUBKEY_HEX', 'nicht-hex')
  Deno.env.set('BOOTSTRAP_RELAY', 'wss://relay.primal.net')
  assertThrows(() => loadConfig(), Error, '64 hex')
})
