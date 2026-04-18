import { assertThrows } from '@std/assert'
import { validatePost, validateSlug } from '../src/core/validation.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

Deno.test('validateSlug: akzeptiert lowercase/digits/hyphen', () => {
  validateSlug('abc-123')
  validateSlug('a')
  validateSlug('dezentrale-oep-oer')
})

Deno.test('validateSlug: lehnt Großbuchstaben ab', () => {
  assertThrows(() => validateSlug('Abc'), Error, 'slug')
})

Deno.test('validateSlug: lehnt Unterstriche/Leerzeichen ab', () => {
  assertThrows(() => validateSlug('a_b'), Error, 'slug')
  assertThrows(() => validateSlug('a b'), Error, 'slug')
})

Deno.test('validateSlug: lehnt führenden Bindestrich ab', () => {
  assertThrows(() => validateSlug('-abc'), Error, 'slug')
})

Deno.test('validatePost: ok bei vollständigem Frontmatter', () => {
  const fm: Frontmatter = {
    title: 'T',
    slug: 'ok-slug',
    date: new Date('2024-01-01'),
  }
  validatePost(fm)
})

Deno.test('validatePost: fehlt title', () => {
  const fm = { slug: 'ok', date: new Date() } as unknown as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'title')
})

Deno.test('validatePost: date muss Date sein', () => {
  const fm = { title: 'T', slug: 'ok', date: 'not-a-date' } as unknown as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'date')
})
