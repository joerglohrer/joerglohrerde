import { assertEquals } from '@std/assert'
import { publishToRelays } from '../src/core/relays.ts'

const sampleEvent = {
  kind: 1,
  pubkey: 'p',
  created_at: 1,
  tags: [],
  content: 'x',
  id: 'i',
  sig: 's',
}

Deno.test('publishToRelays: meldet OK-Antworten je relay', async () => {
  const injected = async (url: string, _ev: unknown) => {
    if (url.includes('fail')) return { ok: false, reason: 'nope' }
    return { ok: true }
  }
  const result = await publishToRelays(
    ['wss://ok1.example', 'wss://ok2.example', 'wss://fail.example'],
    sampleEvent,
    { publishFn: injected, retries: 0, timeoutMs: 100 },
  )
  assertEquals(result.ok.sort(), ['wss://ok1.example', 'wss://ok2.example'])
  assertEquals(result.failed, ['wss://fail.example'])
})

Deno.test('publishToRelays: retry bei Fehler', async () => {
  let attempts = 0
  const injected = async () => {
    attempts++
    if (attempts < 2) return { ok: false, reason: 'transient' }
    return { ok: true }
  }
  const result = await publishToRelays(
    ['wss://flaky.example'],
    sampleEvent,
    { publishFn: injected, retries: 1, timeoutMs: 100, backoffMs: 1 },
  )
  assertEquals(result.ok, ['wss://flaky.example'])
  assertEquals(attempts, 2)
})

Deno.test('publishToRelays: timeout → failed', async () => {
  const pendingTimers: number[] = []
  const injected = () =>
    new Promise<{ ok: boolean }>((resolve) => {
      const t = setTimeout(() => resolve({ ok: true }), 500)
      pendingTimers.push(t)
    })
  try {
    const result = await publishToRelays(
      ['wss://slow.example'],
      sampleEvent,
      { publishFn: injected, retries: 0, timeoutMs: 10 },
    )
    assertEquals(result.failed, ['wss://slow.example'])
  } finally {
    for (const t of pendingTimers) clearTimeout(t)
  }
})
