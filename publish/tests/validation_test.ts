import { assertEquals, assertThrows } from '@std/assert'
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

Deno.test('validatePost: lehnt beliebige strings als date ab', () => {
  const fm = { title: 'T', slug: 'ok', date: 'not-a-date' } as unknown as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'date')
})

Deno.test('validatePost: akzeptiert YYYY-MM-DD string-date (coerce zu Date)', () => {
  const fm = { title: 'T', slug: 'ok', date: '2023-02-26' } as unknown as Frontmatter
  validatePost(fm)
  assertEquals(fm.date instanceof Date, true)
  assertEquals((fm.date as Date).toISOString().startsWith('2023-02-26'), true)
})

Deno.test('validatePost: akzeptiert ISO-string-date', () => {
  const fm = {
    title: 'T',
    slug: 'ok',
    date: '2024-01-15T10:30:00Z',
  } as unknown as Frontmatter
  validatePost(fm)
  assertEquals(fm.date instanceof Date, true)
})

Deno.test('validatePost: akzeptiert a-tag im korrekten format', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['30023:abcdef0123456789:other-slug'],
  } as Frontmatter
  validatePost(fm) // wirft nicht
})

Deno.test('validatePost: lehnt a-tag mit falschem format ab', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['nur-ein-string'],
  } as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'invalid a-tag')
})

Deno.test('validatePost: lehnt a-tag mit fehlendem d-tag ab', () => {
  const fm = {
    title: 'T',
    slug: 'abc',
    date: new Date('2024-01-01'),
    a: ['30023:abcdef:'],
  } as Frontmatter
  assertThrows(() => validatePost(fm), Error, 'invalid a-tag')
})
