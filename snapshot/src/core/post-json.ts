import { nip19 } from 'nostr-tools'
import type { SignedEvent } from './types.ts'

export interface CoverImage {
  url: string
  width?: number
  height?: number
  alt?: string
  mime?: string
}

export interface TranslationRef {
  lang: string
  slug: string
  title: string
}

export interface PostJson {
  slug: string
  event_id: string
  created_at: number
  published_at: number
  title: string
  summary: string
  lang: string
  cover_image: CoverImage | null
  content_markdown: string
  tags: string[]
  naddr: string
  habla_url: string
  translations: TranslationRef[]
}

const SUMMARY_MAX = 200

function tagValue(ev: SignedEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1]
}

function tagsAll(ev: SignedEvent, name: string): string[] {
  return ev.tags
    .filter((t) => t[0] === name && typeof t[1] === 'string')
    .map((t) => t[1] as string)
}

function deriveSummary(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim()
  if (flat.length <= SUMMARY_MAX) return flat
  const cut = flat.slice(0, SUMMARY_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > SUMMARY_MAX * 0.5 ? cut.slice(0, lastSpace) : cut
  return trimmed + '…'
}

export function buildPostJson(
  ev: SignedEvent,
  titleByDtag: Map<string, string>,
): PostJson {
  const slug = tagValue(ev, 'd') ?? ''
  const title = tagValue(ev, 'title') ?? ''
  const summaryTag = tagValue(ev, 'summary')
  const summary = summaryTag && summaryTag.length > 0 ? summaryTag : deriveSummary(ev.content)
  const image = tagValue(ev, 'image')
  const publishedAtRaw = tagValue(ev, 'published_at')
  const publishedAt = publishedAtRaw ? parseInt(publishedAtRaw, 10) : ev.created_at
  const lang = ev.tags.find((t) => t[0] === 'l' && t[2] === 'ISO-639-1')?.[1] ?? 'de'

  const cover_image: CoverImage | null = image
    ? { url: image, alt: title || undefined }
    : null

  const naddr = nip19.naddrEncode({
    kind: ev.kind,
    pubkey: ev.pubkey,
    identifier: slug,
  })

  // TODO multi-lang: aktuell ableitung "andere sprache = en wenn lang=de, sonst de"
  // funktioniert nur fuer den 2-sprachen-fall. Bei 3+ sprachen muss die lang aus dem
  // referenzierten event ausgelesen werden — dafuer braucht buildPostJson zugriff
  // auf den event-pool, nicht nur auf titleByDtag.
  const translations: TranslationRef[] = []
  for (const tag of ev.tags) {
    if (tag[0] !== 'a') continue
    if (tag[3] !== 'translation') continue
    const coord = tag[1]
    if (!coord) continue
    const parts = coord.split(':')
    if (parts.length !== 3) continue
    const otherSlug = parts[2]
    const otherTitle = titleByDtag.get(otherSlug) ?? otherSlug
    translations.push({
      lang: lang === 'de' ? 'en' : 'de',
      slug: otherSlug,
      title: otherTitle,
    })
  }

  return {
    slug,
    event_id: ev.id,
    created_at: ev.created_at,
    published_at: publishedAt,
    title,
    summary,
    lang,
    cover_image,
    content_markdown: ev.content,
    tags: tagsAll(ev, 't'),
    naddr,
    habla_url: `https://habla.news/a/${naddr}`,
    translations,
  }
}
