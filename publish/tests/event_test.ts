import { assertEquals } from '@std/assert'
import { buildKind30023 } from '../src/core/event.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

const PUBKEY = '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41'

Deno.test('buildKind30023: minimaler Post liefert alle Pflicht-Tags', () => {
  const fm: Frontmatter = {
    title: 'Hello',
    slug: 'hello',
    date: new Date('2024-01-15T00:00:00Z'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body text',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: 'test-client',
    nowSeconds: 1_700_000_000,
  })
  assertEquals(ev.kind, 30023)
  assertEquals(ev.pubkey, PUBKEY)
  assertEquals(ev.created_at, 1_700_000_000)
  assertEquals(ev.content, 'body text')
  const tags = ev.tags
  assertEquals(tags.find((t) => t[0] === 'd'), ['d', 'hello'])
  assertEquals(tags.find((t) => t[0] === 'title'), ['title', 'Hello'])
  assertEquals(
    tags.find((t) => t[0] === 'published_at')?.[1],
    String(Math.floor(Date.UTC(2024, 0, 15) / 1000)),
  )
  assertEquals(tags.find((t) => t[0] === 'client'), ['client', 'test-client'])
})

Deno.test('buildKind30023: mapping summary / image / tags', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
    description: 'Summary text',
    tags: ['Foo', 'Bar Baz'],
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: 'https://bl.example/cover-hash.png',
    pubkeyHex: PUBKEY,
    clientTag: 'x',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.find((t) => t[0] === 'summary'), ['summary', 'Summary text'])
  assertEquals(
    ev.tags.find((t) => t[0] === 'image'),
    ['image', 'https://bl.example/cover-hash.png'],
  )
  assertEquals(
    ev.tags.filter((t) => t[0] === 't'),
    [['t', 'Foo'], ['t', 'Bar Baz']],
  )
})

Deno.test('buildKind30023: ohne coverUrl kein image-tag', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: 'x',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.some((t) => t[0] === 'image'), false)
})

Deno.test('buildKind30023: leerer clientTag wird weggelassen', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 's',
    date: new Date('2024-01-01'),
  }
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'b',
    coverUrl: undefined,
    pubkeyHex: PUBKEY,
    clientTag: '',
    nowSeconds: 1,
  })
  assertEquals(ev.tags.some((t) => t[0] === 'client'), false)
})

Deno.test('buildKind30023: schreibt a-tags aus frontmatter mit marker "translation"', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01T00:00:00Z'),
    lang: 'de',
    a: [
      '30023:0123456789abcdef:other-slug',
      '30023:0123456789abcdef:third-slug',
    ],
  } as Frontmatter
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body',
    coverUrl: undefined,
    pubkeyHex: '0123456789abcdef',
    clientTag: '',
    nowSeconds: 1700000000,
  })
  const aTags = ev.tags.filter((t) => t[0] === 'a')
  assertEquals(aTags, [
    ['a', '30023:0123456789abcdef:other-slug', '', 'translation'],
    ['a', '30023:0123456789abcdef:third-slug', '', 'translation'],
  ])
})

Deno.test('buildKind30023: ohne a im frontmatter keine a-tags im event', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01T00:00:00Z'),
    lang: 'de',
  } as Frontmatter
  const ev = buildKind30023({
    fm,
    rewrittenBody: 'body',
    coverUrl: undefined,
    pubkeyHex: '0123456789abcdef',
    clientTag: '',
    nowSeconds: 1700000000,
  })
  assertEquals(ev.tags.filter((t) => t[0] === 'a'), [])
})
