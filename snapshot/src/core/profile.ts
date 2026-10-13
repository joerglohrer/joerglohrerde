import type { SignedEvent } from './types.ts'

/**
 * Autoren-Profil aus kind:0, reduziert auf die felder, die die SPA im hero
 * zeigt. Wird in index.json geschrieben, damit die startseite ohne
 * relay-roundtrip vorgerendert werden kann.
 */
export interface ProfileJson {
  name?: string
  display_name?: string
  about?: string
  website?: string
  picture?: string
  nip05?: string
}

const FIELDS: (keyof ProfileJson)[] = [
  'name',
  'display_name',
  'about',
  'website',
  'picture',
  'nip05',
]

/** Neuestes kind:0 des autors → ProfileJson, oder null wenn keins/kaputt. */
export function extractProfile(events: SignedEvent[], authorPubkey: string): ProfileJson | null {
  let latest: SignedEvent | undefined
  for (const ev of events) {
    if (ev.kind !== 0 || ev.pubkey !== authorPubkey) continue
    if (!latest || ev.created_at > latest.created_at) latest = ev
  }
  if (!latest) return null
  try {
    const raw = JSON.parse(latest.content) as Record<string, unknown>
    const out: ProfileJson = {}
    for (const key of FIELDS) {
      const v = raw[key]
      if (typeof v === 'string' && v.trim().length > 0) out[key] = v.trim()
    }
    return out
  } catch {
    return null
  }
}
