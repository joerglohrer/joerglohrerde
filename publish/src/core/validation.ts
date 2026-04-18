import type { Frontmatter } from './frontmatter.ts'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export function validateSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`invalid slug: "${slug}" (must match ${SLUG_RE})`)
  }
}

export function validatePost(fm: Frontmatter): void {
  if (!fm.title || typeof fm.title !== 'string') {
    throw new Error('missing/invalid title')
  }
  if (!fm.slug || typeof fm.slug !== 'string') {
    throw new Error('missing/invalid slug')
  }
  validateSlug(fm.slug)
  if (!(fm.date instanceof Date) || isNaN(fm.date.getTime())) {
    throw new Error('missing/invalid date (expected YAML date)')
  }
}
