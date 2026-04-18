import { Relay, RelayPool } from 'applesauce-relay'
import { firstValueFrom, timeout } from 'rxjs'

export interface SignedEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface PublishResult {
  ok: boolean
  reason?: string
}

export type PublishFn = (url: string, ev: SignedEvent) => Promise<PublishResult>

export interface PublishOptions {
  publishFn?: PublishFn
  retries?: number
  timeoutMs?: number
  backoffMs?: number
}

export interface RelaysReport {
  ok: string[]
  failed: string[]
}

const defaultPool = new RelayPool()

const defaultPublish: PublishFn = async (url, ev) => {
  try {
    const relay = defaultPool.relay(url)
    const result = await firstValueFrom(relay.publish(ev).pipe(timeout({ first: 10_000 })))
    return { ok: result.ok, reason: result.message }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

async function publishOne(
  url: string,
  ev: SignedEvent,
  opts: Required<PublishOptions>,
): Promise<boolean> {
  const total = opts.retries + 1
  for (let i = 0; i < total; i++) {
    let timerId: number | undefined
    const timeoutPromise = new Promise<PublishResult>((resolve) => {
      timerId = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), opts.timeoutMs)
    })
    const res = await Promise.race([opts.publishFn(url, ev), timeoutPromise])
    if (timerId !== undefined) clearTimeout(timerId)
    if (res.ok) return true
    if (i < total - 1) await new Promise((r) => setTimeout(r, opts.backoffMs * Math.pow(3, i)))
  }
  return false
}

export async function publishToRelays(
  urls: string[],
  ev: SignedEvent,
  options: PublishOptions = {},
): Promise<RelaysReport> {
  const opts: Required<PublishOptions> = {
    publishFn: options.publishFn ?? defaultPublish,
    retries: options.retries ?? 2,
    timeoutMs: options.timeoutMs ?? 10_000,
    backoffMs: options.backoffMs ?? 1000,
  }
  const results = await Promise.all(
    urls.map(async (url) => ({ url, ok: await publishOne(url, ev, opts) })),
  )
  return {
    ok: results.filter((r) => r.ok).map((r) => r.url),
    failed: results.filter((r) => !r.ok).map((r) => r.url),
  }
}

export type ExistingQuery = (url: string, pubkey: string, slug: string) => Promise<boolean>

const defaultExistingQuery: ExistingQuery = async (url, pubkey, slug) => {
  try {
    const relay = new Relay(url)
    const ev = await firstValueFrom(
      relay
        .request({ kinds: [30023], authors: [pubkey], '#d': [slug], limit: 1 })
        .pipe(timeout({ first: 5_000 })),
    )
    return !!ev
  } catch {
    return false
  }
}

export async function checkExisting(
  slug: string,
  pubkey: string,
  urls: string[],
  opts: { query?: ExistingQuery } = {},
): Promise<boolean> {
  const query = opts.query ?? defaultExistingQuery
  const results = await Promise.all(urls.map((u) => query(u, pubkey, slug)))
  return results.some((r) => r)
}
