import { extname, join } from '@std/path'

const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const HUGO_DERIVATIVE = /_hu_[0-9a-f]+\./

export function mimeFromExt(filename: string): string {
  return MIME_MAP[extname(filename).toLowerCase()] ?? 'application/octet-stream'
}

export interface ImageFile {
  fileName: string
  absolutePath: string
  data: Uint8Array
  mimeType: string
}

export async function collectImages(postDir: string): Promise<ImageFile[]> {
  const results: ImageFile[] = []
  for await (const entry of Deno.readDir(postDir)) {
    if (!entry.isFile) continue
    if (HUGO_DERIVATIVE.test(entry.name)) continue
    const ext = extname(entry.name).toLowerCase()
    if (!IMG_EXTS.has(ext)) continue
    const abs = join(postDir, entry.name)
    const data = await Deno.readFile(abs)
    results.push({
      fileName: entry.name,
      absolutePath: abs,
      data,
      mimeType: mimeFromExt(entry.name),
    })
  }
  results.sort((a, b) => a.fileName.localeCompare(b.fileName))
  return results
}
