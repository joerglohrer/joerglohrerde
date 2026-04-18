import { NostrConnectSigner } from 'applesauce-signers'
import { RelayPool } from 'applesauce-relay'
import type { UnsignedEvent } from './event.ts'
import type { SignedEvent } from './relays.ts'

export interface Signer {
  getPublicKey(): Promise<string>
  signEvent(ev: UnsignedEvent): Promise<SignedEvent>
}

const signerPool = new RelayPool()

NostrConnectSigner.subscriptionMethod = (relays, filters) => signerPool.req(relays, filters)
NostrConnectSigner.publishMethod = (relays, event) => signerPool.event(relays, event)

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timerId: number | undefined
  const timeoutPromise = new Promise<never>((_r, rej) => {
    timerId = setTimeout(() => rej(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([p, timeoutPromise]).finally(() => {
    if (timerId !== undefined) clearTimeout(timerId)
  }) as Promise<T>
}

export async function createBunkerSigner(bunkerUrl: string): Promise<Signer> {
  const signer = await withTimeout(
    NostrConnectSigner.fromBunkerURI(bunkerUrl),
    30_000,
    'Bunker connect',
  )
  const pubkey = await withTimeout(signer.getPublicKey(), 30_000, 'Bunker getPublicKey')
  return {
    getPublicKey: () => Promise.resolve(pubkey),
    signEvent: async (ev: UnsignedEvent) => {
      const signed = await withTimeout(signer.signEvent(ev), 30_000, 'Bunker signEvent')
      return signed as SignedEvent
    },
  }
}
