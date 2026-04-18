export type RunMode = 'diff' | 'force-all' | 'post-single'

export interface PostLog {
  slug: string
  status: 'success' | 'failed' | 'skipped-draft'
  action?: 'new' | 'update'
  event_id?: string
  relays_ok?: string[]
  relays_failed?: string[]
  blossom_servers_ok?: string[]
  images_uploaded?: number
  duration_ms?: number
  error?: string
}

export interface RunLog {
  run_id: string
  started_at: string
  ended_at: string
  mode: RunMode
  posts: PostLog[]
  exit_code: number
}

export interface SuccessArgs {
  slug: string
  action: 'new' | 'update'
  eventId: string
  relaysOk: string[]
  relaysFailed: string[]
  blossomServersOk: string[]
  imagesUploaded: number
  durationMs: number
}

export interface FailedArgs {
  slug: string
  error: string
  durationMs: number
}

export interface LoggerOptions {
  mode: RunMode
  runId: string
  print?: (line: string) => void
  now?: () => Date
}

export interface Logger {
  postSuccess(args: SuccessArgs): void
  postFailed(args: FailedArgs): void
  postSkippedDraft(slug: string): void
  finalize(exitCode: number): RunLog
  writeJson(path: string, summary: RunLog): Promise<void>
}

export function createLogger(opts: LoggerOptions): Logger {
  const print = opts.print ?? ((line: string) => console.log(line))
  const now = opts.now ?? (() => new Date())
  const posts: PostLog[] = []
  const startedAt = now().toISOString()
  return {
    postSuccess(a) {
      posts.push({
        slug: a.slug,
        status: 'success',
        action: a.action,
        event_id: a.eventId,
        relays_ok: a.relaysOk,
        relays_failed: a.relaysFailed,
        blossom_servers_ok: a.blossomServersOk,
        images_uploaded: a.imagesUploaded,
        duration_ms: a.durationMs,
      })
      print(
        `✓ ${a.slug} (${a.action}) — relays:${a.relaysOk.length}ok/${a.relaysFailed.length}fail — ${a.durationMs}ms`,
      )
    },
    postFailed(a) {
      posts.push({
        slug: a.slug,
        status: 'failed',
        error: a.error,
        duration_ms: a.durationMs,
      })
      print(`✗ ${a.slug} — ${a.error}`)
    },
    postSkippedDraft(slug) {
      posts.push({ slug, status: 'skipped-draft' })
      print(`- ${slug} (draft, skipped)`)
    },
    finalize(exitCode) {
      return {
        run_id: opts.runId,
        started_at: startedAt,
        ended_at: now().toISOString(),
        mode: opts.mode,
        posts,
        exit_code: exitCode,
      }
    },
    writeJson(path, summary) {
      return Deno.writeTextFile(path, JSON.stringify(summary, null, 2))
    },
  }
}
