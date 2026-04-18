import { assertEquals } from '@std/assert'
import { parseBlossomServers } from '../src/core/blossom-list.ts'

Deno.test('parseBlossomServers: extrahiert server-urls in reihenfolge', () => {
  const ev = {
    kind: 10063,
    tags: [
      ['server', 'https://a.example'],
      ['server', 'https://b.example'],
      ['other', 'ignored'],
    ],
  }
  assertEquals(parseBlossomServers(ev), ['https://a.example', 'https://b.example'])
})

Deno.test('parseBlossomServers: leere liste bei fehlenden tags', () => {
  assertEquals(parseBlossomServers({ tags: [] }), [])
})

Deno.test('parseBlossomServers: entfernt trailing-slash normalisierung', () => {
  const ev = {
    kind: 10063,
    tags: [
      ['server', 'https://a.example/'],
    ],
  }
  assertEquals(parseBlossomServers(ev), ['https://a.example'])
})
