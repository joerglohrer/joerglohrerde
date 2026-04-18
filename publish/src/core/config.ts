export interface Config {
  bunkerUrl: string
  authorPubkeyHex: string
  bootstrapRelay: string
  contentRoot: string
  clientTag: string
  minRelayAcks: number
  clientSecretHex?: string
}

type EnvReader = (key: string) => string | undefined

const REQUIRED = ['BUNKER_URL', 'AUTHOR_PUBKEY_HEX', 'BOOTSTRAP_RELAY'] as const

const DEFAULTS = {
  CONTENT_ROOT: '../content/posts',
  CLIENT_TAG: '',
  MIN_RELAY_ACKS: '2',
}

export function loadConfig(read: EnvReader = (k) => Deno.env.get(k)): Config {
  const missing: string[] = []
  const values: Record<string, string> = {}
  for (const key of REQUIRED) {
    const v = read(key)
    if (!v) missing.push(key)
    else values[key] = v
  }
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`)
  }
  if (!/^[0-9a-f]{64}$/.test(values.AUTHOR_PUBKEY_HEX)) {
    throw new Error('AUTHOR_PUBKEY_HEX must be 64 lowercase hex characters')
  }
  const minAcksRaw = read('MIN_RELAY_ACKS') ?? DEFAULTS.MIN_RELAY_ACKS
  const minAcks = Number(minAcksRaw)
  if (!Number.isInteger(minAcks) || minAcks < 1) {
    throw new Error(`MIN_RELAY_ACKS must be a positive integer, got "${minAcksRaw}"`)
  }
  const clientSecretHex = read('CLIENT_SECRET_HEX')
  if (clientSecretHex && !/^[0-9a-f]{64}$/.test(clientSecretHex)) {
    throw new Error('CLIENT_SECRET_HEX must be 64 lowercase hex characters')
  }
  return {
    bunkerUrl: values.BUNKER_URL,
    authorPubkeyHex: values.AUTHOR_PUBKEY_HEX,
    bootstrapRelay: values.BOOTSTRAP_RELAY,
    contentRoot: read('CONTENT_ROOT') ?? DEFAULTS.CONTENT_ROOT,
    clientTag: read('CLIENT_TAG') ?? DEFAULTS.CLIENT_TAG,
    minRelayAcks: minAcks,
    clientSecretHex,
  }
}
