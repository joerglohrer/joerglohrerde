import { assertEquals, assertThrows } from '@std/assert'
import { loadConfig } from '../src/core/config.ts'

const REQUIRED = {
  BUNKER_URL: 'bunker://abc?relay=wss://r.example&secret=s',
  AUTHOR_PUBKEY_HEX: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
  BOOTSTRAP_RELAY: 'wss://relay.damus.io',
}

Deno.test('loadConfig: liest alle pflicht-keys aus env', () => {
  const cfg = loadConfig((k) => REQUIRED[k as keyof typeof REQUIRED])
  assertEquals(cfg.bunkerUrl, REQUIRED.BUNKER_URL)
  assertEquals(cfg.authorPubkeyHex, REQUIRED.AUTHOR_PUBKEY_HEX)
  assertEquals(cfg.bootstrapRelay, REQUIRED.BOOTSTRAP_RELAY)
})

Deno.test('loadConfig: liefert defaults für optionale keys', () => {
  const cfg = loadConfig((k) => REQUIRED[k as keyof typeof REQUIRED])
  assertEquals(cfg.contentRoot, '../content/posts')
  assertEquals(cfg.clientTag, '')
  assertEquals(cfg.minRelayAcks, 2)
})

Deno.test('loadConfig: optionale keys können überschrieben werden', () => {
  const env = {
    ...REQUIRED,
    CONTENT_ROOT: '../blog',
    CLIENT_TAG: 'my-site',
    MIN_RELAY_ACKS: '3',
  }
  const cfg = loadConfig((k) => env[k as keyof typeof env])
  assertEquals(cfg.contentRoot, '../blog')
  assertEquals(cfg.clientTag, 'my-site')
  assertEquals(cfg.minRelayAcks, 3)
})

Deno.test('loadConfig: wirft bei fehlender pflicht-variable', () => {
  assertThrows(() => loadConfig(() => undefined), Error, 'BUNKER_URL')
})

Deno.test('loadConfig: validiert pubkey-format (64 hex)', () => {
  const env = { ...REQUIRED, AUTHOR_PUBKEY_HEX: 'zzz' }
  assertThrows(
    () => loadConfig((k) => env[k as keyof typeof env]),
    Error,
    'AUTHOR_PUBKEY_HEX',
  )
})

Deno.test('loadConfig: MIN_RELAY_ACKS muss positiv sein', () => {
  const env = { ...REQUIRED, MIN_RELAY_ACKS: '0' }
  assertThrows(
    () => loadConfig((k) => env[k as keyof typeof env]),
    Error,
    'MIN_RELAY_ACKS',
  )
})
