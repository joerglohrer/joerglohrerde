import type { Frontmatter } from './frontmatter.ts'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const DATE_STRING_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/

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
  // Coerce string-dates (YAML `date: "2023-02-26"`) in-place zu Date.
  // Native YAML-Dates (`date: 2023-02-26` ohne quotes) kommen bereits als
  // Date-instanz aus dem yaml-parser.
  if (typeof fm.date === 'string' && DATE_STRING_RE.test(fm.date)) {
    const coerced = new Date(fm.date)
    if (!isNaN(coerced.getTime())) fm.date = coerced
  }
  if (!(fm.date instanceof Date) || isNaN(fm.date.getTime())) {
    throw new Error('missing/invalid date (expected YAML date or ISO-string)')
  }
}
