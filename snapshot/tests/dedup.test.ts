import { assertEquals } from '@std/assert'
import { dedupByDtag } from '../src/core/dedup.ts'
import type { SignedEvent } from '../src/core/types.ts'

function ev(d: string, created_at: number, id: string): SignedEvent {
  return {
    id, pubkey: 'p', created_at, kind: 30023, sig: 's', content: '',
    tags: [['d', d]],
  }
}

Deno.test('dedupByDtag behaelt das neueste event pro d-tag', () => {
  const out = dedupByDtag([
    ev('a', 100, 'a-old'),
    ev('a', 200, 'a-new'),
    ev('b', 50, 'b-only'),
  ])
  const ids = out.map((e) => e.id).sort()
  assertEquals(ids, ['a-new', 'b-only'])
})

Deno.test('dedupByDtag laesst events ohne d-tag weg', () => {
  const out = dedupByDtag([
    { id: 'x', pubkey: 'p', created_at: 1, kind: 30023, sig: 's', content: '', tags: [] },
    ev('a', 1, 'a'),
  ])
  assertEquals(out.length, 1)
  assertEquals(out[0].id, 'a')
})
