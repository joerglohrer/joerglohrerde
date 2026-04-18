import { parseArgs } from '@std/cli/parse-args'
import { join } from '@std/path'
import { loadConfig } from './core/config.ts'
import { createBunkerSigner } from './core/signer.ts'
import { loadOutbox } from './core/outbox.ts'
import { loadBlossomServers } from './core/blossom-list.ts'
import { parseFrontmatter } from './core/frontmatter.ts'
import { checkExisting, publishToRelays } from './core/relays.ts'
import { uploadBlob } from './core/blossom.ts'
import { collectImages } from './core/image-collector.ts'
import { allPostDirs, changedPostDirs } from './core/change-detection.ts'
import { createLogger, type RunMode } from './core/log.ts'
import { type PostDeps, processPost } from './subcommands/publish.ts'
import { printCheckResult, runCheck } from './subcommands/check.ts'
import { validatePostFile } from './subcommands/validate-post.ts'

function uuid(): string {
  return crypto.randomUUID()
}

async function cmdCheck(): Promise<number> {
  const config = loadConfig()
  const result = await runCheck(config)
  printCheckResult(result)
  return result.ok ? 0 : 1
}

async function cmdValidatePost(path: string | undefined): Promise<number> {
  if (!path) {
    console.error('usage: validate-post <path-to-index.md>')
    return 2
  }
  const result = await validatePostFile(path)
  if (result.ok) {
    console.log(`✓ ${path} ok (slug: ${result.slug})`)
    return 0
  }
  console.error(`✗ ${path}: ${result.error}`)
  return 1
}

async function findBySlug(dirs: string[], slug: string): Promise<string | undefined> {
  for (const d of dirs) {
    try {
      const text = await Deno.readTextFile(join(d, 'index.md'))
      const { fm } = parseFrontmatter(text)
      if (fm.slug === slug) return d
    } catch {
      // skip
    }
  }
  return undefined
}

async function resolvePostDirs(
  mode: RunMode,
  contentRoot: string,
  single?: string,
): Promise<string[]> {
  if (mode === 'post-single' && single) {
    if (single.startsWith(contentRoot + '/')) return [single]
    const all = await allPostDirs(contentRoot)
    const match = all.find((d) => d.endsWith(`/${single}`)) ?? (await findBySlug(all, single))
    if (!match) throw new Error(`post mit slug "${single}" nicht gefunden`)
    return [match]
  }
  if (mode === 'force-all') return await allPostDirs(contentRoot)
  const before = Deno.env.get('GITHUB_EVENT_BEFORE') ?? 'HEAD~1'
  return await changedPostDirs({ from: before, to: 'HEAD', contentRoot })
}

async function cmdPublish(flags: {
  forceAll: boolean
  post?: string
  dryRun: boolean
}): Promise<number> {
  const config = loadConfig()
  const mode: RunMode = flags.post ? 'post-single' : flags.forceAll ? 'force-all' : 'diff'
  const runId = uuid()
  const logger = createLogger({ mode, runId })

  console.log('[1/3] signer…')
  const signer = await createBunkerSigner(config.bunkerUrl, {
    clientSecretHex: config.clientSecretHex,
  })
  console.log('[2/3] outbox…')
  const outbox = await loadOutbox(config.bootstrapRelay, config.authorPubkeyHex)
  console.log('[3/3] blossom-server-liste…')
  const blossomServers = await loadBlossomServers(config.bootstrapRelay, config.authorPubkeyHex)
  console.log('setup done')
  if (outbox.write.length === 0) {
    console.error('no write relays in kind:10002')
    return 1
  }
  if (blossomServers.length === 0) {
    console.error('no blossom servers in kind:10063')
    return 1
  }

  const postDirs = await resolvePostDirs(mode, config.contentRoot, flags.post)
  console.log(
    `mode=${mode} posts=${postDirs.length} runId=${runId} contentRoot=${config.contentRoot}`,
  )

  if (flags.dryRun) {
    for (const d of postDirs) console.log(`  dry-run: ${d}`)
    return 0
  }

  const deps: PostDeps = {
    readPostFile: async (p) => parseFrontmatter(await Deno.readTextFile(p)),
    collectImages: (dir) => collectImages(dir),
    uploadBlossom: (a) =>
      uploadBlob({
        data: a.data,
        fileName: a.fileName,
        mimeType: a.mimeType,
        servers: blossomServers,
        signer,
      }),
    sign: (ev) => signer.signEvent(ev),
    publish: (ev, relays) => publishToRelays(relays, ev),
    checkExisting: (slug, relays) => checkExisting(slug, config.authorPubkeyHex, relays),
  }

  let anyFailed = false
  for (const dir of postDirs) {
    const result = await processPost({
      postDir: dir,
      writeRelays: outbox.write,
      blossomServers,
      pubkeyHex: config.authorPubkeyHex,
      clientTag: config.clientTag,
      minRelayAcks: config.minRelayAcks,
      deps,
    })
    if (result.status === 'success') {
      logger.postSuccess({
        slug: result.slug,
        action: result.action!,
        eventId: result.eventId!,
        relaysOk: result.relaysOk,
        relaysFailed: result.relaysFailed,
        blossomServersOk: result.blossomServersOk,
        imagesUploaded: result.imagesUploaded,
        durationMs: result.durationMs,
      })
    } else if (result.status === 'skipped-draft') {
      logger.postSkippedDraft(result.slug)
    } else {
      anyFailed = true
      logger.postFailed({
        slug: result.slug,
        error: result.error ?? 'unknown',
        durationMs: result.durationMs,
      })
    }
  }

  const exitCode = anyFailed ? 1 : 0
  const summary = logger.finalize(exitCode)
  await Deno.mkdir('./logs', { recursive: true })
  const logPath = `./logs/publish-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  await logger.writeJson(logPath, summary)
  console.log(`log: ${logPath}`)
  return exitCode
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    boolean: ['force-all', 'dry-run'],
    string: ['post'],
  })
  const sub = args._[0]
  if (sub === 'check') return cmdCheck()
  if (sub === 'validate-post') return cmdValidatePost(args._[1] as string | undefined)
  if (sub === 'publish') {
    return cmdPublish({
      forceAll: args['force-all'] === true,
      post: args.post,
      dryRun: args['dry-run'] === true,
    })
  }
  console.error('usage: cli.ts <publish | check | validate-post> [flags]')
  return 2
}

if (import.meta.main) {
  Deno.exit(await main())
}
