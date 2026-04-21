import { assertEquals, assertThrows } from '@std/assert'
import { parseFrontmatter } from '../src/core/frontmatter.ts'

Deno.test('parseFrontmatter: zerlegt Frontmatter und Body', async () => {
  const md = await Deno.readTextFile('./tests/fixtures/sample-post.md')
  const { fm, body } = parseFrontmatter(md)
  assertEquals(fm.title, 'Sample Title')
  assertEquals(fm.slug, 'sample-slug')
  assertEquals(fm.date instanceof Date, true)
  assertEquals(fm.tags, ['Foo', 'Bar'])
  assertEquals(fm.cover?.image, 'cover.png')
  assertEquals(body.trim().startsWith('Body content here.'), true)
})

Deno.test('parseFrontmatter: wirft bei fehlendem Frontmatter', () => {
  assertThrows(() => parseFrontmatter('no frontmatter here'), Error, 'Frontmatter')
})

Deno.test('parseFrontmatter: wirft bei unvollständigem Frontmatter', () => {
  assertThrows(() => parseFrontmatter('---\ntitle: x\n'), Error, 'Frontmatter')
})

Deno.test('parseFrontmatter: erhält Leerzeichen in String-Werten', () => {
  const md = '---\ntitle: "Hello World"\nslug: "h-w"\ndate: 2024-01-01\n---\n\nbody'
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.title, 'Hello World')
})

Deno.test('parseFrontmatter: liest a-tag-liste aus frontmatter', () => {
  const md = [
    '---',
    'title: T',
    'slug: s',
    'date: 2024-01-01',
    'a:',
    '  - "30023:abc:other-slug"',
    '---',
    'body',
  ].join('\n')
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.a, ['30023:abc:other-slug'])
})

Deno.test('parseFrontmatter: a fehlt → undefined', () => {
  const md = '---\ntitle: T\nslug: s\ndate: 2024-01-01\n---\nbody'
  const { fm } = parseFrontmatter(md)
  assertEquals(fm.a, undefined)
})
