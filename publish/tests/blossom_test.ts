import { assertEquals } from '@std/assert'
import { type BlossomClient, uploadBlob } from '../src/core/blossom.ts'
import type { Signer } from '../src/core/signer.ts'
import type { UnsignedEvent } from '../src/core/event.ts'
import type { SignedEvent } from '../src/core/relays.ts'

function fakeSigner(): Signer {
  return {
    getPublicKey: () => Promise.resolve('p'),
    signEvent: (ev: UnsignedEvent) =>
      Promise.resolve({ ...ev, id: 'id', sig: 'sig', pubkey: 'p' } as SignedEvent),
  }
}

Deno.test('uploadBlob: pusht zu allen servern, gibt erste url zurück', async () => {
  const data = new Uint8Array([1, 2, 3])
  const client: BlossomClient = {
    fetch: (url, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify({ url: url + '/hash.png', sha256: 'hash' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    },
  }
  const result = await uploadBlob({
    data,
    fileName: 'x.png',
    mimeType: 'image/png',
    servers: ['https://a.example', 'https://b.example'],
    signer: fakeSigner(),
    client,
  })
  assertEquals(result.ok.length, 2)
  assertEquals(result.primaryUrl, 'https://a.example/upload/hash.png')
})

Deno.test('uploadBlob: akzeptiert wenn mindestens ein server ok', async () => {
  const data = new Uint8Array([1])
  const client: BlossomClient = {
    fetch: (url) => {
      if (url.startsWith('https://fail.example')) {
        return Promise.resolve(new Response('nope', { status: 500 }))
      }
      return Promise.resolve(
        new Response(JSON.stringify({ url: url + '/h.png', sha256: 'h' }), { status: 200 }),
      )
    },
  }
  const result = await uploadBlob({
    data,
    fileName: 'x.png',
    mimeType: 'image/png',
    servers: ['https://fail.example', 'https://ok.example'],
    signer: fakeSigner(),
    client,
  })
  assertEquals(result.ok, ['https://ok.example'])
  assertEquals(result.failed, ['https://fail.example'])
})

Deno.test('uploadBlob: wirft wenn alle server ablehnen', async () => {
  const data = new Uint8Array([1])
  const client: BlossomClient = {
    fetch: () => Promise.resolve(new Response('err', { status: 500 })),
  }
  let threw = false
  try {
    await uploadBlob({
      data,
      fileName: 'x.png',
      mimeType: 'image/png',
      servers: ['https://a.example'],
      signer: fakeSigner(),
      client,
    })
  } catch (err) {
    threw = true
    assertEquals(String(err).includes('all blossom servers failed'), true)
  }
  assertEquals(threw, true)
})
