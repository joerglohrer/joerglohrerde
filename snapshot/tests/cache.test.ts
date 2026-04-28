import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { readCache, writeCache, type CacheState } from '../src/core/cache.ts'

Deno.test('readCache: file fehlt -> undefined', async () => {
  const dir = await Deno.makeTempDir()
  const path = join(dir, 'cache.json')
  const cache = await readCache(path)
  assertEquals(cache, undefined)
})

Deno.test('writeCache + readCache: round-trip', async () => {
  const dir = await Deno.makeTempDir()
  const path = join(dir, 'cache.json')
  const state: CacheState = { lastKnownGoodCount: 27, deletedCoords: ['30023:P:dead'] }
  await writeCache(path, state)
  const out = await readCache(path)
  assertEquals(out, state)
})
