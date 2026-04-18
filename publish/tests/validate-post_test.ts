import { assertEquals } from '@std/assert'
import { validatePostFile } from '../src/subcommands/validate-post.ts'

Deno.test('validatePostFile: ok bei fixture-post', async () => {
  const result = await validatePostFile('./tests/fixtures/sample-post.md')
  assertEquals(result.ok, true)
  assertEquals(result.slug, 'sample-slug')
})

Deno.test('validatePostFile: fehler bei fehlender datei', async () => {
  const result = await validatePostFile('./does-not-exist.md')
  assertEquals(result.ok, false)
  assertEquals(result.error?.includes('read'), true)
})

Deno.test('validatePostFile: fehler bei ungültigem slug', async () => {
  const tmp = await Deno.makeTempFile({ suffix: '.md' })
  try {
    await Deno.writeTextFile(
      tmp,
      '---\ntitle: "T"\nslug: "Bad Slug"\ndate: 2024-01-01\n---\n\nbody',
    )
    const result = await validatePostFile(tmp)
    assertEquals(result.ok, false)
    assertEquals(result.error?.includes('slug'), true)
  } finally {
    await Deno.remove(tmp)
  }
})
