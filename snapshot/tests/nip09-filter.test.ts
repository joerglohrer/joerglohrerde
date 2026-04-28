import { assertEquals } from '@std/assert'
import { filterDeleted } from '../src/core/nip09-filter.ts'
import type { SignedEvent } from '../src/core/types.ts'

function post(d: string, id: string): SignedEvent {
  return { id, pubkey: 'P', created_at: 1, kind: 30023, sig: 's', content: '', tags: [['d', d]] }
}
function deletion(coords: string[]): SignedEvent {
  return {
    id: 'del', pubkey: 'P', created_at: 2, kind: 5, sig: 's', content: '',
    tags: coords.map((c) => ['a', c]),
  }
}

Deno.test('filterDeleted entfernt events deren coord in einem kind:5 referenziert ist', () => {
  const out = filterDeleted(
    [post('alive', 'a'), post('dead', 'b')],
    [deletion(['30023:P:dead'])],
    'P',
  )
  assertEquals(out.map((e) => e.id), ['a'])
})

Deno.test('filterDeleted ignoriert kind:5 fremder pubkeys', () => {
  const fremde: SignedEvent = {
    ...deletion(['30023:P:alive']), pubkey: 'OTHER',
  }
  const out = filterDeleted([post('alive', 'a')], [fremde], 'P')
  assertEquals(out.length, 1)
})

Deno.test('filterDeleted: re-publizierter post (post.created_at > deletion.created_at) bleibt erhalten', () => {
  const oldDelete: SignedEvent = {
    id: 'del', pubkey: 'P', created_at: 100, kind: 5, sig: 's', content: '',
    tags: [['a', '30023:P:resurrected']],
  }
  const newPost: SignedEvent = {
    id: 'new', pubkey: 'P', created_at: 200, kind: 30023, sig: 's', content: '',
    tags: [['d', 'resurrected']],
  }
  const out = filterDeleted([newPost], [oldDelete], 'P')
  assertEquals(out.length, 1)
  assertEquals(out[0].id, 'new')
})

Deno.test('filterDeleted: post mit created_at <= deletion.created_at wird entfernt', () => {
  const newDelete: SignedEvent = {
    id: 'del', pubkey: 'P', created_at: 200, kind: 5, sig: 's', content: '',
    tags: [['a', '30023:P:dead']],
  }
  const oldPost: SignedEvent = {
    id: 'old', pubkey: 'P', created_at: 100, kind: 30023, sig: 's', content: '',
    tags: [['d', 'dead']],
  }
  const out = filterDeleted([oldPost], [newDelete], 'P')
  assertEquals(out.length, 0)
})
