import { assertEquals } from '@std/assert'
import { parseOutbox } from '../src/core/outbox.ts'

Deno.test('parseOutbox: r-tags ohne marker → beide', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://damus'],
      ['r', 'wss://nos'],
    ],
  }
  assertEquals(parseOutbox(ev), {
    read: ['wss://damus', 'wss://nos'],
    write: ['wss://damus', 'wss://nos'],
  })
})

Deno.test('parseOutbox: marker read ignoriert schreib-nutzung', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://r-only', 'read'],
      ['r', 'wss://w-only', 'write'],
      ['r', 'wss://both'],
    ],
  }
  assertEquals(parseOutbox(ev), {
    read: ['wss://r-only', 'wss://both'],
    write: ['wss://w-only', 'wss://both'],
  })
})

Deno.test('parseOutbox: ignoriert andere tag-namen', () => {
  const ev = {
    kind: 10002,
    tags: [
      ['r', 'wss://x'],
      ['p', 'someone'],
    ],
  }
  assertEquals(parseOutbox(ev), { read: ['wss://x'], write: ['wss://x'] })
})
