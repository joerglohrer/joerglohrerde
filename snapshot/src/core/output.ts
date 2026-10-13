import { ensureDir } from '@std/fs'
import { join } from '@std/path'
import type { PostJson } from './post-json.ts'
import type { ProfileJson } from './profile.ts'

export interface OutputInput {
  generatedAt: string
  authorPubkey: string
  relaysQueried: string[]
  relaysResponded: string[]
  posts: PostJson[]
  /** Autoren-profil (kind:0), null wenn auf keinem relay gefunden. */
  profile?: ProfileJson | null
}

export async function writeOutput(outDir: string, input: OutputInput): Promise<void> {
  await ensureDir(outDir)
  await ensureDir(join(outDir, 'posts'))

  const index = {
    generated_at: input.generatedAt,
    author_pubkey: input.authorPubkey,
    relays_queried: input.relaysQueried,
    relays_responded: input.relaysResponded,
    post_count: input.posts.length,
    profile: input.profile ?? null,
    // Listen-metadaten, damit startseite/archiv/tag-seiten direkt aus
    // index.json vorgerendert werden koennen (ohne content_markdown).
    posts: input.posts.map((p) => ({
      slug: p.slug,
      lang: p.lang,
      created_at: p.created_at,
      published_at: p.published_at,
      title: p.title,
      summary: p.summary,
      cover_image: p.cover_image,
      tags: p.tags,
    })),
  }
  await Deno.writeTextFile(
    join(outDir, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
  )

  for (const post of input.posts) {
    await Deno.writeTextFile(
      join(outDir, 'posts', `${post.slug}.json`),
      JSON.stringify(post, null, 2) + '\n',
    )
  }
}
