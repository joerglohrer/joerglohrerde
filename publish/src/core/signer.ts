import { NostrConnectSigner, SimpleSigner } from 'applesauce-signers'
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

// Workaround: amber sendet bei wiederholten connect-requests mit bereits
// bekanntem secret "already connected" oder "no permission". applesauce-
// signers wirft daraufhin unhandled rejections, weil der request intern
// schon aufgelöst wurde. wir schlucken diese benannten fehler prozessweit.
const BENIGN_CONNECT_ERRORS = ['already connected', 'no permission']

function isBenignConnectError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return BENIGN_CONNECT_ERRORS.some((e) => lower.includes(e))
}

globalThis.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  const reason = e.reason
  const msg = reason instanceof Error ? reason.message : String(reason)
  if (isBenignConnectError(msg)) {
    e.preventDefault()
  }
})

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timerId: number | undefined
  const timeoutPromise = new Promise<never>((_r, rej) => {
    timerId = setTimeout(() => rej(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([p, timeoutPromise]).finally(() => {
    if (timerId !== undefined) clearTimeout(timerId)
  }) as Promise<T>
}

export interface CreateSignerOptions {
  clientSecretHex?: string
}

export async function createBunkerSigner(
  bunkerUrl: string,
  options: CreateSignerOptions = {},
): Promise<Signer> {
  const { remote, relays, secret } = NostrConnectSigner.parseBunkerURI(bunkerUrl)
  console.log(`  signer: setup (remote=${remote.slice(0, 8)}…, relays=${relays.length})`)
  // Stabile client-identität: ohne festen CLIENT_SECRET_HEX erzeugt
  // applesauce pro lauf einen zufälligen key, und amber sieht jeden lauf
  // als neue app → permissions greifen nie. mit festem key bleibt die
  // identität über läufe erhalten.
  const clientSigner = options.clientSecretHex
    ? SimpleSigner.fromKey(options.clientSecretHex)
    : undefined
  const signer = new NostrConnectSigner({ relays, remote, signer: clientSigner })
  const clientPubkey = await signer.signer.getPublicKey()
  console.log(`  signer: client-pubkey=${clientPubkey.slice(0, 8)}…`)
  // connect() beim ersten mal nötig (damit amber die app registriert);
  // bei späteren runs ist amber schon gepaired mit diesem client-pubkey
  // und antwortet auf get_public_key / sign_event ohne erneuten connect.
  // wir versuchen connect, schlucken benign errors, und fallen-back auf
  // manuelles open().
  try {
    await withTimeout(signer.connect(secret), 60_000, 'Bunker connect')
    console.log('  signer: connect ok')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!isBenignConnectError(msg)) throw err
    console.log(`  signer: connect benign "${msg}", fallback to open+force`)
    await signer.open()
    ;(signer as unknown as { isConnected: boolean }).isConnected = true
  }
  console.log('  signer: getPublicKey…')
  const pubkey = await withTimeout(signer.getPublicKey(), 30_000, 'Bunker getPublicKey')
  console.log(`  signer: pubkey ok (${pubkey.slice(0, 8)}…)`)
  return {
    getPublicKey: () => Promise.resolve(pubkey),
    signEvent: async (ev: UnsignedEvent) => {
      const signed = await withTimeout(signer.signEvent(ev), 30_000, 'Bunker signEvent')
      return signed as SignedEvent
    },
  }
}
