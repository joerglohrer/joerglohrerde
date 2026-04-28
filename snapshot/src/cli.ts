import { parseArgs } from '@std/cli'
import { join, resolve } from '@std/path'
import { loadConfig } from './core/config.ts'
import { loadReadRelays, fetchEvents } from './core/relays.ts'
import { dedupByDtag } from './core/dedup.ts'
import { filterDeleted } from './core/nip09-filter.ts'
import { runChecks } from './core/checks.ts'
import { buildPostJson } from './core/post-json.ts'
import { probeCover } from './core/cover-probe.ts'
import { writeOutput } from './core/output.ts'
import { readCache, writeCache, type CacheState } from './core/cache.ts'
import type { SignedEvent } from './core/types.ts'

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    string: ['out', 'cache', 'min-events'],
    boolean: ['allow-shrink'],
    default: {
      out: resolve(import.meta.dirname!, '../output'),
    },
  })
  const outDir = String(args.out)
  const cachePath = args.cache ? String(args.cache) : join(outDir, '.last-snapshot.json')
  const allowShrink = args['allow-shrink'] === true

  const cfg = loadConfig()
  const cache = await readCache(cachePath)
  const minEvents = args['min-events']
    ? parseInt(String(args['min-events']), 10)
    : cache
      ? Math.max(1, cache.lastKnownGoodCount - 2)
      : 1

  console.log('snapshot: bootstrap relay =', cfg.bootstrapRelay)
  const readRelays = await loadReadRelays(cfg.bootstrapRelay, cfg.authorPubkeyHex)
  console.log('snapshot: read relays =', readRelays.join(', '))

  const fetched = await fetchEvents(readRelays, cfg.authorPubkeyHex)
  console.log(
    `snapshot: ${fetched.responded.length}/${fetched.queried.length} relays geantwortet, ` +
      `${fetched.events.length} events roh`,
  )

  const posts: SignedEvent[] = []
  const deletions: SignedEvent[] = []
  for (const ev of fetched.events) {
    if (ev.kind === 30023) posts.push(ev)
    else if (ev.kind === 5) deletions.push(ev)
  }

  const dedupedPosts = dedupByDtag(posts)
  const filtered = filterDeleted(dedupedPosts, deletions, cfg.authorPubkeyHex)

  const previousDeletedCoords = new Set(cache?.deletedCoords ?? [])
  const newlyDeletedCount = deletions.flatMap((d) =>
    d.tags.filter((t) => t[0] === 'a' && t[1] && !previousDeletedCoords.has(t[1])).map((t) => t[1])
  ).length

  runChecks({
    relaysQueried: fetched.queried.length,
    relaysResponded: fetched.responded.length,
    eventCount: filtered.length,
    minEvents,
    lastKnownGoodCount: cache?.lastKnownGoodCount,
    newDeletionsCount: newlyDeletedCount,
    allowShrink,
  })

  const titleByDtag = new Map<string, string>()
  for (const ev of filtered) {
    const d = ev.tags.find((t) => t[0] === 'd')?.[1]
    const title = ev.tags.find((t) => t[0] === 'title')?.[1]
    if (d && title) titleByDtag.set(d, title)
  }
  const postJsons = filtered.map((ev) => buildPostJson(ev, titleByDtag))

  for (const p of postJsons) {
    if (!p.cover_image) continue
    const probe = await probeCover(p.cover_image.url)
    if (!probe.reachable) {
      console.warn(
        `snapshot: cover unreachable [${probe.status}] ${p.cover_image.url} (slug=${p.slug}) — URL wird trotzdem geschrieben`,
      )
    }
  }

  await writeOutput(outDir, {
    generatedAt: new Date().toISOString(),
    authorPubkey: cfg.authorPubkeyHex,
    relaysQueried: fetched.queried,
    relaysResponded: fetched.responded,
    posts: postJsons,
  })

  const allDeletedCoords = deletions.flatMap((d) =>
    d.tags.filter((t) => t[0] === 'a' && t[1]).map((t) => t[1] as string)
  )
  const newCache: CacheState = {
    lastKnownGoodCount: filtered.length,
    deletedCoords: [...new Set(allDeletedCoords)],
  }
  await writeCache(cachePath, newCache)

  console.log(`snapshot: ${filtered.length} posts geschrieben nach ${outDir}`)
  return 0
}

if (import.meta.main) {
  try {
    Deno.exit(await main())
  } catch (err) {
    console.error('snapshot: HARD-FAIL —', err instanceof Error ? err.message : String(err))
    Deno.exit(1)
  }
}
