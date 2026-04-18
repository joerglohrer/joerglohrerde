import { encodeBase64 } from '@std/encoding/base64'
import type { Signer } from './signer.ts'
import type { UnsignedEvent } from './event.ts'

export interface BlossomClient {
  fetch(url: string, init: RequestInit): Promise<Response>
}

export interface UploadArgs {
  data: Uint8Array
  fileName: string
  mimeType: string
  servers: string[]
  signer: Signer
  client?: BlossomClient
}

export interface UploadReport {
  ok: string[]
  failed: string[]
  primaryUrl: string
  sha256: string
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function buildAuth(signer: Signer, hash: string): Promise<string> {
  const pubkey = await signer.getPublicKey()
  const auth: UnsignedEvent = {
    kind: 24242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['t', 'upload'],
      ['x', hash],
      ['expiration', String(Math.floor(Date.now() / 1000) + 300)],
    ],
    content: '',
  }
  const signed = await signer.signEvent(auth)
  return 'Nostr ' + encodeBase64(new TextEncoder().encode(JSON.stringify(signed)))
}

async function uploadOne(
  server: string,
  data: Uint8Array,
  mimeType: string,
  auth: string,
  client: BlossomClient,
): Promise<{ ok: boolean; url?: string }> {
  try {
    const resp = await client.fetch(server + '/upload', {
      method: 'PUT',
      headers: { authorization: auth, 'content-type': mimeType },
      body: data as BodyInit,
    })
    if (!resp.ok) return { ok: false }
    const json = await resp.json()
    return { ok: true, url: json.url }
  } catch {
    return { ok: false }
  }
}

const defaultClient: BlossomClient = { fetch: (u, i) => fetch(u, i) }

export async function uploadBlob(args: UploadArgs): Promise<UploadReport> {
  const client = args.client ?? defaultClient
  const hash = await sha256Hex(args.data)
  const auth = await buildAuth(args.signer, hash)
  const results = await Promise.all(
    args.servers.map((s) =>
      uploadOne(s, args.data, args.mimeType, auth, client).then((r) => ({ server: s, ...r }))
    ),
  )
  const ok = results.filter((r) => r.ok).map((r) => r.server)
  const failed = results.filter((r) => !r.ok).map((r) => r.server)
  if (ok.length === 0) {
    throw new Error(`all blossom servers failed for ${args.fileName}`)
  }
  const first = results.find((r) => r.ok && r.url)!
  return { ok, failed, primaryUrl: first.url!, sha256: hash }
}
