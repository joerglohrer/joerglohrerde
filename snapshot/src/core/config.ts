export interface Config {
  authorPubkeyHex: string
  bootstrapRelay: string
}

export function loadConfig(): Config {
  const authorPubkeyHex = Deno.env.get('AUTHOR_PUBKEY_HEX')
  const bootstrapRelay = Deno.env.get('BOOTSTRAP_RELAY')
  if (!authorPubkeyHex) throw new Error('AUTHOR_PUBKEY_HEX fehlt in env')
  if (!/^[0-9a-f]{64}$/i.test(authorPubkeyHex)) {
    throw new Error('AUTHOR_PUBKEY_HEX muss 64 hex chars sein')
  }
  if (!bootstrapRelay) throw new Error('BOOTSTRAP_RELAY fehlt in env')
  return { authorPubkeyHex, bootstrapRelay }
}
