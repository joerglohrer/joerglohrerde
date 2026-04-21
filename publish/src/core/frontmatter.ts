import { parse as parseYaml } from '@std/yaml'

export interface Author {
  name: string
  url?: string
  orcid?: string
  [key: string]: unknown
}

export interface ImageEntry {
  file: string
  role?: 'cover'
  alt: string
  caption?: string
  license: string | 'UNKNOWN'
  authors: Author[] | 'UNKNOWN'
  source_url?: string
  modifications?: string
  [key: string]: unknown
}

export interface Frontmatter {
  title: string
  slug: string
  date: Date
  description?: string
  image?: string
  cover?: { image?: string; alt?: string; caption?: string }
  tags?: string[]
  draft?: boolean
  license?: string
  lang?: string
  authors?: Author[]
  images?: ImageEntry[]
  a?: string[]
  [key: string]: unknown
}

export function parseFrontmatter(md: string): { fm: Frontmatter; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    throw new Error('Frontmatter: no leading --- / --- block found')
  }
  const fm = parseYaml(match[1]) as Frontmatter
  if (!fm || typeof fm !== 'object') {
    throw new Error('Frontmatter: YAML did not produce an object')
  }
  return { fm, body: match[2] }
}
