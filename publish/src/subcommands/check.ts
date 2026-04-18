import type { Config } from '../core/config.ts'
import { createBunkerSigner } from '../core/signer.ts'
import { loadOutbox } from '../core/outbox.ts'
import { loadBlossomServers } from '../core/blossom-list.ts'

export interface CheckResult {
  ok: boolean
  issues: string[]
}

export async function runCheck(config: Config): Promise<CheckResult> {
  const issues: string[] = []

  try {
    const signer = await createBunkerSigner(config.bunkerUrl)
    const pk = await signer.getPublicKey()
    if (pk !== config.authorPubkeyHex) {
      issues.push(
        `bunker-pubkey (${pk}) matcht AUTHOR_PUBKEY_HEX (${config.authorPubkeyHex}) nicht`,
      )
    }
  } catch (err) {
    issues.push(`bunker-ping fehlgeschlagen: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const outbox = await loadOutbox(config.bootstrapRelay, config.authorPubkeyHex)
    if (outbox.write.length === 0) {
      issues.push('kind:10002 hat keine write-relays — publiziere zuerst ein gültiges Event')
    }
  } catch (err) {
    issues.push(`kind:10002 laden: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const servers = await loadBlossomServers(config.bootstrapRelay, config.authorPubkeyHex)
    if (servers.length === 0) {
      issues.push('kind:10063 hat keine server — publiziere zuerst ein gültiges Event')
    } else {
      for (const server of servers) {
        try {
          const resp = await fetch(server + '/', { method: 'HEAD' })
          if (!resp.ok && resp.status !== 405) {
            issues.push(`blossom-server ${server}: HTTP ${resp.status}`)
          }
        } catch (err) {
          issues.push(`blossom-server ${server}: ${err instanceof Error ? err.message : err}`)
        }
      }
    }
  } catch (err) {
    issues.push(`kind:10063 laden: ${err instanceof Error ? err.message : err}`)
  }

  return { ok: issues.length === 0, issues }
}

export function printCheckResult(result: CheckResult): void {
  if (result.ok) {
    console.log('✓ pre-flight ok')
    return
  }
  console.error('✗ pre-flight issues:')
  for (const i of result.issues) console.error(`  - ${i}`)
}
