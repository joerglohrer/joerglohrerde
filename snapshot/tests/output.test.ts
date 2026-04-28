import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { writeOutput } from '../src/core/output.ts'
import type { PostJson } from '../src/core/post-json.ts'

const samplePost: PostJson = {
  slug: 'a', event_id: 'e1', created_at: 1, published_at: 1,
  title: 'A', summary: 's', lang: 'de', cover_image: null,
  content_markdown: '# A', tags: [], naddr: 'naddr1', habla_url: 'https://habla.news/a/naddr1',
  translations: [],
}

Deno.test('writeOutput schreibt index.json + posts/<slug>.json', async () => {
  const dir = await Deno.makeTempDir()
  await writeOutput(dir, {
    generatedAt: '2026-04-28T10:00:00Z',
    authorPubkey: 'P',
    relaysQueried: ['wss://r1', 'wss://r2'],
    relaysResponded: ['wss://r1'],
    posts: [samplePost],
  })

  const indexText = await Deno.readTextFile(join(dir, 'index.json'))
  const index = JSON.parse(indexText)
  assertEquals(index.author_pubkey, 'P')
  assertEquals(index.post_count, 1)
  assertEquals(index.posts.length, 1)
  assertEquals(index.posts[0].slug, 'a')
  assertEquals(index.posts[0].title, 'A')
  assertEquals(index.posts[0].lang, 'de')

  const postText = await Deno.readTextFile(join(dir, 'posts', 'a.json'))
  const post = JSON.parse(postText)
  assertEquals(post.slug, 'a')
  assertEquals(post.content_markdown, '# A')
})
