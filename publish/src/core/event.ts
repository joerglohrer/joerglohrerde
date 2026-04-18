import type { Frontmatter } from './frontmatter.ts'

export interface UnsignedEvent {
  kind: number
  pubkey: string
  created_at: number
  tags: string[][]
  content: string
}

export interface BuildArgs {
  fm: Frontmatter
  rewrittenBody: string
  coverUrl: string | undefined
  pubkeyHex: string
  clientTag: string
  nowSeconds: number
  additionalTags?: string[][]
}

export function buildKind30023(args: BuildArgs): UnsignedEvent {
  const { fm, rewrittenBody, coverUrl, pubkeyHex, clientTag, nowSeconds, additionalTags } = args
  const publishedAt = Math.floor(fm.date.getTime() / 1000)
  const tags: string[][] = [
    ['d', fm.slug],
    ['title', fm.title],
    ['published_at', String(publishedAt)],
  ]
  if (fm.description) tags.push(['summary', fm.description])
  if (coverUrl) tags.push(['image', coverUrl])
  if (Array.isArray(fm.tags)) {
    for (const t of fm.tags) tags.push(['t', String(t)])
  }
  const lang = (fm.lang ?? 'de').toLowerCase()
  if (/^[a-z]{2}$/.test(lang)) {
    tags.push(['L', 'ISO-639-1'])
    tags.push(['l', lang, 'ISO-639-1'])
  }
  if (clientTag) tags.push(['client', clientTag])
  if (additionalTags) tags.push(...additionalTags)
  return {
    kind: 30023,
    pubkey: pubkeyHex,
    created_at: nowSeconds,
    tags,
    content: rewrittenBody,
  }
}
