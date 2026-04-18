import { assertEquals } from '@std/assert'
import { createLogger } from '../src/core/log.ts'

Deno.test('logger: sammelt post-einträge und schreibt summary', () => {
  const sink: string[] = []
  const logger = createLogger({
    mode: 'force-all',
    runId: 'run-1',
    print: (line) => sink.push(line),
    now: () => new Date('2026-04-16T10:00:00Z'),
  })
  logger.postSuccess({
    slug: 's1',
    action: 'new',
    eventId: 'ev1',
    relaysOk: ['wss://r1'],
    relaysFailed: [],
    blossomServersOk: [],
    imagesUploaded: 0,
    durationMs: 10,
  })
  logger.postSkippedDraft('s2')
  const summary = logger.finalize(0)
  assertEquals(summary.run_id, 'run-1')
  assertEquals(summary.mode, 'force-all')
  assertEquals(summary.posts.length, 2)
  assertEquals(summary.posts[0].status, 'success')
  assertEquals(summary.posts[1].status, 'skipped-draft')
  assertEquals(summary.exit_code, 0)
  assertEquals(sink.some((s) => s.includes('s1')), true)
})

Deno.test('logger: writeJson schreibt datei', async () => {
  const tmp = await Deno.makeTempDir()
  try {
    const logger = createLogger({
      mode: 'diff',
      runId: 'run-2',
      print: () => {},
      now: () => new Date('2026-04-16T10:00:00Z'),
    })
    const summary = logger.finalize(0)
    await logger.writeJson(`${tmp}/out.json`, summary)
    const text = await Deno.readTextFile(`${tmp}/out.json`)
    const parsed = JSON.parse(text)
    assertEquals(parsed.run_id, 'run-2')
  } finally {
    await Deno.remove(tmp, { recursive: true })
  }
})
