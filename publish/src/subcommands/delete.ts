import type { Signer } from '../core/signer.ts'
import type { UnsignedEvent } from '../core/event.ts'
import { publishToRelays } from '../core/relays.ts'

export interface DeleteArgs {
  eventIds: string[]
  reason?: string
  signer: Signer
  writeRelays: string[]
  pubkeyHex: string
  clientTag: string
  minRelayAcks: number
}

export interface DeleteResult {
  ok: boolean
  deleteEventId: string
  relaysOk: string[]
  relaysFailed: string[]
}

export async function runDelete(args: DeleteArgs): Promise<DeleteResult> {
  const { eventIds, reason, signer, writeRelays, pubkeyHex, clientTag, minRelayAcks } = args
  const tags: string[][] = eventIds.map((id) => ['e', id])
  if (clientTag) tags.push(['client', clientTag])
  const unsigned: UnsignedEvent = {
    kind: 5,
    pubkey: pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: reason ?? '',
  }
  const signed = await signer.signEvent(unsigned)
  const report = await publishToRelays(writeRelays, signed)
  return {
    ok: report.ok.length >= minRelayAcks,
    deleteEventId: signed.id,
    relaysOk: report.ok,
    relaysFailed: report.failed,
  }
}
