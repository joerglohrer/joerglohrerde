import { join } from '@std/path'
import { type Frontmatter } from '../core/frontmatter.ts'
import { validatePost } from '../core/validation.ts'
import { buildKind30023, type UnsignedEvent } from '../core/event.ts'
import { resolveCoverUrl, rewriteImageUrls } from '../core/markdown.ts'
import type { ImageFile } from '../core/image-collector.ts'
import type { RelaysReport, SignedEvent } from '../core/relays.ts'
import type { UploadReport } from '../core/blossom.ts'

export interface PostDeps {
  readPostFile(path: string): Promise<{ fm: Frontmatter; body: string }>
  collectImages(postDir: string): Promise<ImageFile[]>
  uploadBlossom(args: {
    data: Uint8Array
    fileName: string
    mimeType: string
  }): Promise<UploadReport>
  sign(ev: UnsignedEvent): Promise<SignedEvent>
  publish(ev: SignedEvent, relays: string[]): Promise<RelaysReport>
  checkExisting(slug: string, relays: string[]): Promise<boolean>
}

export interface ProcessArgs {
  postDir: string
  writeRelays: string[]
  blossomServers: string[]
  pubkeyHex: string
  clientTag: string
  minRelayAcks: number
  deps: PostDeps
  now?: () => number
}

export interface ProcessResult {
  status: 'success' | 'failed' | 'skipped-draft'
  action?: 'new' | 'update'
  slug: string
  eventId?: string
  relaysOk: string[]
  relaysFailed: string[]
  blossomServersOk: string[]
  imagesUploaded: number
  durationMs: number
  error?: string
}

export async function processPost(args: ProcessArgs): Promise<ProcessResult> {
  const started = performance.now()
  const now = args.now ?? (() => Math.floor(Date.now() / 1000))
  let slug = '?'
  try {
    const { fm, body } = await args.deps.readPostFile(join(args.postDir, 'index.md'))
    validatePost(fm)
    slug = fm.slug

    if (fm.draft === true) {
      return {
        status: 'skipped-draft',
        slug,
        relaysOk: [],
        relaysFailed: [],
        blossomServersOk: [],
        imagesUploaded: 0,
        durationMs: Math.round(performance.now() - started),
      }
    }

    const images = await args.deps.collectImages(args.postDir)
    const blossomOkServers = new Set<string>()
    const mapping = new Map<string, string>()
    for (const img of images) {
      const rep = await args.deps.uploadBlossom({
        data: img.data,
        fileName: img.fileName,
        mimeType: img.mimeType,
      })
      for (const s of rep.ok) blossomOkServers.add(s)
      mapping.set(img.fileName, rep.primaryUrl)
    }

    const rewrittenBody = rewriteImageUrls(body, mapping)
    const coverRaw = fm.cover?.image ?? fm.image
    const coverUrl = resolveCoverUrl(coverRaw, mapping)

    const unsigned = buildKind30023({
      fm,
      rewrittenBody,
      coverUrl,
      pubkeyHex: args.pubkeyHex,
      clientTag: args.clientTag,
      nowSeconds: now(),
    })

    const existing = await args.deps.checkExisting(fm.slug, args.writeRelays)
    const signed = await args.deps.sign(unsigned)
    const pubRep = await args.deps.publish(signed, args.writeRelays)
    if (pubRep.ok.length < args.minRelayAcks) {
      throw new Error(
        `insufficient relays acked (${pubRep.ok.length} < ${args.minRelayAcks})`,
      )
    }

    return {
      status: 'success',
      action: existing ? 'update' : 'new',
      slug,
      eventId: signed.id,
      relaysOk: pubRep.ok,
      relaysFailed: pubRep.failed,
      blossomServersOk: [...blossomOkServers],
      imagesUploaded: images.length,
      durationMs: Math.round(performance.now() - started),
    }
  } catch (err) {
    return {
      status: 'failed',
      slug,
      relaysOk: [],
      relaysFailed: [],
      blossomServersOk: [],
      imagesUploaded: 0,
      durationMs: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
