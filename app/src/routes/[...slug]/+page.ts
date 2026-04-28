import { error, redirect } from '@sveltejs/kit'
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy'
import type { EntryGenerator, PageLoad } from './$types'
import { browser } from '$app/environment'

export const ssr = true
export const prerender = true
export const trailingSlash = 'always'

interface SnapshotIndex {
  posts: Array<{ slug: string; lang: string; title: string }>
}

interface PostJson {
  slug: string
  event_id: string
  created_at: number
  published_at: number
  title: string
  summary: string
  lang: string
  cover_image: { url: string; alt?: string; width?: number; height?: number; mime?: string } | null
  content_markdown: string
  tags: string[]
  naddr: string
  habla_url: string
  translations: Array<{ lang: string; slug: string; title: string }>
}

let cachedIndex: SnapshotIndex | undefined
async function readIndex(): Promise<SnapshotIndex> {
  if (cachedIndex) return cachedIndex
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const dir = path.resolve('../snapshot/output')
  const text = await fs.readFile(path.join(dir, 'index.json'), 'utf-8')
  cachedIndex = JSON.parse(text) as SnapshotIndex
  return cachedIndex
}

async function readPost(slug: string): Promise<PostJson | undefined> {
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const dir = path.resolve('../snapshot/output')
    const text = await fs.readFile(path.join(dir, 'posts', `${slug}.json`), 'utf-8')
    return JSON.parse(text) as PostJson
  } catch {
    return undefined
  }
}

export const entries: EntryGenerator = async () => {
  const idx = await readIndex()
  return idx.posts.map((p) => ({ slug: p.slug }))
}

export const load: PageLoad = async ({ url, fetch }) => {
  const pathname = url.pathname

  const legacyDtag = parseLegacyUrl(pathname)
  if (legacyDtag) {
    throw redirect(301, canonicalPostPath(legacyDtag))
  }

  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments.length !== 1 || !segments[0]) {
    throw error(404, 'Seite nicht gefunden')
  }
  const dtag = decodeURIComponent(segments[0])

  if (!browser) {
    const snapshot = await readPost(dtag)
    if (!snapshot) throw error(404, 'Post nicht gefunden')
    return { dtag, snapshot }
  }

  // Im Browser: snapshot per fetch von /snapshot-data/posts/<slug>.json laden.
  // Beim Hard-Reload einer prerenderten URL nutzt SvelteKit das ins HTML
  // serialisierte page-data; bei clientseitiger Navigation kommt der
  // request hier durch und holt das fehlende JSON. 404 vom server (slug
  // nicht im snapshot) → kein post.
  try {
    const resp = await fetch(`/snapshot-data/posts/${dtag}.json`)
    if (!resp.ok) throw error(404, 'Post nicht gefunden')
    const snapshot = (await resp.json()) as PostJson
    return { dtag, snapshot }
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err
    throw error(404, 'Post nicht gefunden')
  }
}
