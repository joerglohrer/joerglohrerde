import { assertEquals } from '@std/assert'
import { type PostDeps, processPost } from '../src/subcommands/publish.ts'
import type { Frontmatter } from '../src/core/frontmatter.ts'

function makeDeps(overrides: Partial<PostDeps> = {}): PostDeps {
  return {
    readPostFile: () =>
      Promise.resolve({
        fm: {
          title: 'T',
          slug: 's',
          date: new Date('2024-01-01'),
        } as Frontmatter,
        body: 'body',
      }),
    collectImages: () => Promise.resolve([]),
    uploadBlossom: (args) =>
      Promise.resolve({
        ok: ['https://b1'],
        failed: [],
        primaryUrl: `https://b1/${args.fileName}-hash`,
        sha256: 'hash',
      }),
    sign: (ev) => Promise.resolve({ ...ev, id: 'ev-id', sig: 'sig' }),
    publish: () => Promise.resolve({ ok: ['wss://r1', 'wss://r2'], failed: [] }),
    checkExisting: () => Promise.resolve(false),
    ...overrides,
  }
}

function baseArgs(deps = makeDeps()) {
  return {
    postDir: '/p/s',
    writeRelays: ['wss://r1', 'wss://r2'],
    blossomServers: ['https://b1'],
    pubkeyHex: 'a'.repeat(64),
    clientTag: 'test-client',
    minRelayAcks: 2,
    deps,
  }
}

Deno.test('processPost: happy-path neu, ohne bilder', async () => {
  const result = await processPost(baseArgs())
  assertEquals(result.status, 'success')
  assertEquals(result.action, 'new')
  assertEquals(result.eventId, 'ev-id')
  assertEquals(result.relaysOk.length, 2)
})

Deno.test('processPost: draft wird geskippt', async () => {
  const deps = makeDeps({
    readPostFile: () =>
      Promise.resolve({
        fm: {
          title: 'T',
          slug: 's',
          date: new Date('2024-01-01'),
          draft: true,
        } as Frontmatter,
        body: 'b',
      }),
  })
  const result = await processPost({ ...baseArgs(deps), writeRelays: ['wss://r1'] })
  assertEquals(result.status, 'skipped-draft')
})

Deno.test('processPost: zu wenig relay-acks → failed', async () => {
  const deps = makeDeps({
    publish: () =>
      Promise.resolve({ ok: ['wss://r1'], failed: ['wss://r2', 'wss://r3', 'wss://r4'] }),
  })
  const result = await processPost({
    ...baseArgs(deps),
    writeRelays: ['wss://r1', 'wss://r2', 'wss://r3', 'wss://r4'],
  })
  assertEquals(result.status, 'failed')
  assertEquals(String(result.error).includes('relays'), true)
})

Deno.test('processPost: konfigurierbarer minRelayAcks', async () => {
  const deps = makeDeps({
    publish: () => Promise.resolve({ ok: ['wss://r1'], failed: ['wss://r2'] }),
  })
  const result = await processPost({
    ...baseArgs(deps),
    writeRelays: ['wss://r1', 'wss://r2'],
    minRelayAcks: 1,
  })
  assertEquals(result.status, 'success')
})

Deno.test('processPost: bestehender d-tag → action = update', async () => {
  const result = await processPost(
    baseArgs(makeDeps({ checkExisting: () => Promise.resolve(true) })),
  )
  assertEquals(result.status, 'success')
  assertEquals(result.action, 'update')
})

Deno.test('processPost: bilder landen auf blossom, body wird rewritten', async () => {
  const uploaded: string[] = []
  const deps = makeDeps({
    readPostFile: () =>
      Promise.resolve({
        fm: {
          title: 'T',
          slug: 's',
          date: new Date('2024-01-01'),
          cover: { image: 'cover.png' },
        } as Frontmatter,
        body: 'Pic: ![x](a.png) cover ![c](cover.png)',
      }),
    collectImages: () =>
      Promise.resolve([
        {
          fileName: 'a.png',
          absolutePath: '/p/s/a.png',
          data: new Uint8Array([1]),
          mimeType: 'image/png',
        },
        {
          fileName: 'cover.png',
          absolutePath: '/p/s/cover.png',
          data: new Uint8Array([2]),
          mimeType: 'image/png',
        },
      ]),
    uploadBlossom: (args) => {
      uploaded.push(args.fileName)
      return Promise.resolve({
        ok: ['https://b1'],
        failed: [],
        primaryUrl: `https://b1/${args.fileName}-hash`,
        sha256: 'h',
      })
    },
  })
  const result = await processPost(baseArgs(deps))
  assertEquals(result.status, 'success')
  assertEquals(uploaded.sort(), ['a.png', 'cover.png'])
  assertEquals(result.imagesUploaded, 2)
})
