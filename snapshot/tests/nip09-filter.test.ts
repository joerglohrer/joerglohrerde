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
