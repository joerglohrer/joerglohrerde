import { assertEquals } from '@std/assert'
import { buildPostJson } from '../src/core/post-json.ts'
import type { SignedEvent } from '../src/core/types.ts'

const PUBKEY = '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41'

function buildEvent(opts: {
  d: string
  title: string
  summary?: string
  image?: string
  publishedAt?: number
  lang?: string
  tags?: string[]
  translationCoords?: string[]
  content: string
}): SignedEvent {
  const tags: string[][] = [['d', opts.d], ['title', opts.title]]
  if (opts.summary) tags.push(['summary', opts.summary])
  if (opts.image) tags.push(['image', opts.image])
  if (opts.publishedAt) tags.push(['published_at', String(opts.publishedAt)])
  if (opts.lang) {
    tags.push(['L', 'ISO-639-1'])
    tags.push(['l', opts.lang, 'ISO-639-1'])
  }
  for (const t of opts.tags ?? []) tags.push(['t', t])
  for (const c of opts.translationCoords ?? []) tags.push(['a', c, '', 'translation'])
  return {
    id: 'event-' + opts.d, pubkey: PUBKEY, created_at: 1700000000, kind: 30023,
    sig: 'sig', content: opts.content, tags,
  }
}

Deno.test('buildPostJson: vollstaendiges event', () => {
  const ev = buildEvent({
    d: 'bibel-selfies', title: 'Bibel-Selfies', summary: 'Kurz',
    image: 'https://blossom.edufeed.org/abc.jpg',
    publishedAt: 1699000000, lang: 'de', tags: ['Bibel'],
    translationCoords: [`30023:${PUBKEY}:bible-selfies`],
    content: '# body',
  })
  const titleByDtag = new Map([['bible-selfies', 'Bible-Selfies']])
  const json = buildPostJson(ev, titleByDtag)
  assertEquals(json.slug, 'bibel-selfies')
  assertEquals(json.title, 'Bibel-Selfies')
  assertEquals(json.summary, 'Kurz')
  assertEquals(json.lang, 'de')
  assertEquals(json.tags, ['Bibel'])
  assertEquals(json.published_at, 1699000000)
  assertEquals(json.cover_image?.url, 'https://blossom.edufeed.org/abc.jpg')
  assertEquals(json.translations, [
    { lang: 'en', slug: 'bible-selfies', title: 'Bible-Selfies' },
  ])
  assertEquals(json.content_markdown, '# body')
})

Deno.test('buildPostJson: fallback summary aus content', () => {
  const ev = buildEvent({
    d: 'no-summary', title: 'X', content: 'Lorem ipsum dolor sit amet.'.repeat(20),
  })
  const json = buildPostJson(ev, new Map())
  if (!json.summary) throw new Error('summary fehlt')
  if (json.summary.length > 220) throw new Error('summary zu lang')
  if (!json.summary.endsWith('…')) throw new Error('summary ohne ellipsis')
})

Deno.test('buildPostJson: fehlt published_at -> created_at', () => {
  const ev = buildEvent({ d: 'no-pub', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.published_at, 1700000000)
})

Deno.test('buildPostJson: fehlt image -> cover_image null', () => {
  const ev = buildEvent({ d: 'no-img', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.cover_image, null)
})

Deno.test('buildPostJson: lang default de wenn keine l-tags', () => {
  const ev = buildEvent({ d: 'no-lang', title: 'X', content: 'x' })
  const json = buildPostJson(ev, new Map())
  assertEquals(json.lang, 'de')
})

Deno.test('buildPostJson: malformed t-tag ohne value wird ignoriert', () => {
  const ev: SignedEvent = {
    id: 'event-malformed', pubkey: PUBKEY, created_at: 1700000000, kind: 30023,
    sig: 'sig', content: 'x',
    tags: [
      ['d', 'malformed'],
      ['title', 'X'],
      ['t', 'gut'],
      ['t'], // malformed: kein value
      ['t', 'auch-gut'],
    ],
  }
  const json = buildPostJson(ev, new Map())
  assertEquals(json.tags, ['gut', 'auch-gut'])
})
