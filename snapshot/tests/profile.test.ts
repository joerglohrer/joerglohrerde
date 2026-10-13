import { assertEquals } from '@std/assert'
import { extractProfile } from '../src/core/profile.ts'
import type { SignedEvent } from '../src/core/types.ts'

const P = 'a'.repeat(64)
function ev(kind: number, created_at: number, content: string, pubkey = P): SignedEvent {
  return { id: `${kind}-${created_at}`, pubkey, created_at, kind, tags: [], content, sig: '' }
}

Deno.test('extractProfile nimmt das neueste kind:0 des autors', () => {
  const profile = extractProfile(
    [
      ev(0, 10, JSON.stringify({ name: 'alt', about: 'alt' })),
      ev(30023, 50, 'post'),
      ev(0, 20, JSON.stringify({ name: 'neu', display_name: 'Neu', website: 'https://x.de/' })),
      ev(0, 99, JSON.stringify({ name: 'fremd' }), 'b'.repeat(64)),
    ],
    P,
  )
  assertEquals(profile, { name: 'neu', display_name: 'Neu', website: 'https://x.de/' })
})

Deno.test('extractProfile ignoriert nicht-strings und leere felder', () => {
  const profile = extractProfile(
    [ev(0, 1, JSON.stringify({ name: '  ', about: 42, website: ' https://x.de ' }))],
    P,
  )
  assertEquals(profile, { website: 'https://x.de' })
})

Deno.test('extractProfile liefert null ohne kind:0 oder bei kaputtem JSON', () => {
  assertEquals(extractProfile([ev(30023, 1, 'x')], P), null)
  assertEquals(extractProfile([ev(0, 1, '{nope')], P), null)
})
